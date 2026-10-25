import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthUser } from '../common/auth';
import { paginate, PaginationQueryDto } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  CreateCategoryDto,
  CreateProductDto,
  CreateReviewDto,
  ProductQueryDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from './catalog.dto';

const SORT_FIELDS: Record<string, keyof Prisma.ProductOrderByWithRelationInput> = {
  createdAt: 'createdAt',
  price: 'price',
  rating: 'ratingAvg',
  title: 'title',
};

const reviewInclude = { user: { select: { id: true, name: true, avatarUrl: true } } } satisfies Prisma.ReviewInclude;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // --- Kategoriyalar ---

  findCategories() {
    return this.prisma.category.findMany({ orderBy: { id: 'asc' } });
  }

  async createCategory(dto: CreateCategoryDto) {
    await this.assertSlugFree(dto.slug);
    return this.prisma.category.create({ data: dto });
  }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    await this.getCategory(id);
    if (dto.slug) await this.assertSlugFree(dto.slug, id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async removeCategory(id: number) {
    await this.getCategory(id);
    if (await this.prisma.product.count({ where: { categoryId: id } })) {
      throw new ConflictException({ code: 'CATEGORY_NOT_EMPTY', message: 'Category still has products' });
    }
    await this.prisma.category.delete({ where: { id } });
  }

  async setCategoryImage(id: number, url: string) {
    await this.getCategory(id);
    return this.prisma.category.update({ where: { id }, data: { imageUrl: url } });
  }

  private async getCategory(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Category not found' });
    return category;
  }

  private async assertSlugFree(slug: string, exceptId?: number) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException({ code: 'SLUG_TAKEN', message: 'Category slug is already in use' });
    }
  }

  // --- Mahsulotlar ---

  async findProducts(query: ProductQueryDto) {
    const { page = 1, limit = 20, sort = '-createdAt' } = query;
    const where: Prisma.ProductWhereInput = {};
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) where.category = { slug: query.category };
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = { gte: query.minPrice, lte: query.maxPrice };
    }
    if (query.inStock) where.stock = { gt: 0 };

    const desc = sort.startsWith('-');
    const field = SORT_FIELDS[desc ? sort.slice(1) : sort];

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true },
        // id ikkinchi kalit: bir xil qiymatlarda sahifalar orasida tartib o'zgarmasin
        orderBy: [{ [field]: desc ? 'desc' : 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async getProduct(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { category: true } });
    if (!product) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    return product;
  }

  async createProduct(dto: CreateProductDto) {
    await this.getCategory(dto.categoryId);
    const product = await this.prisma.product.create({ data: dto, include: { category: true } });
    this.realtime.toAll('product:created', product);
    return product;
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    await this.getProduct(id);
    if (dto.categoryId !== undefined) await this.getCategory(dto.categoryId);
    const product = await this.prisma.product.update({ where: { id }, data: dto, include: { category: true } });
    this.realtime.toAll('product:updated', product);
    return product;
  }

  async removeProduct(id: number) {
    await this.getProduct(id);
    await this.prisma.product.delete({ where: { id } });
    this.realtime.toAll('product:deleted', { id });
  }

  async addProductImage(id: number, url: string) {
    const product = await this.getProduct(id);
    if (product.images.length >= 10) {
      throw new ConflictException({ code: 'TOO_MANY_IMAGES', message: 'A product can have at most 10 images' });
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: { images: { push: url } },
      include: { category: true },
    });
    this.realtime.toAll('product:updated', updated);
    return updated;
  }

  // --- Sharhlar ---

  async findReviews(productId: number, { page = 1, limit = 20 }: PaginationQueryDto) {
    await this.getProduct(productId);
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        include: reviewInclude,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);
    return paginate(data, total, page, limit);
  }

  async createReview(userId: number, productId: number, dto: CreateReviewDto) {
    await this.getProduct(productId);
    const existing = await this.prisma.review.findUnique({ where: { userId_productId: { userId, productId } } });
    if (existing) {
      throw new ConflictException({ code: 'REVIEW_EXISTS', message: 'You have already reviewed this product' });
    }
    const review = await this.prisma.review.create({ data: { ...dto, userId, productId }, include: reviewInclude });
    await this.refreshRating(productId);
    return review;
  }

  async removeReview(user: AuthUser, id: number) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException({ code: 'REVIEW_NOT_FOUND', message: 'Review not found' });
    if (review.userId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can delete only your own review' });
    }
    await this.prisma.review.delete({ where: { id } });
    await this.refreshRating(review.productId);
  }

  private async refreshRating(productId: number) {
    const stats = await this.prisma.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: true });
    await this.prisma.product.update({
      where: { id: productId },
      data: { ratingAvg: Math.round((stats._avg.rating ?? 0) * 10) / 10, ratingCount: stats._count },
    });
  }
}
