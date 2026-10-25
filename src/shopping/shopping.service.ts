import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { AuthUser } from '../common/auth';
import { paginate, PaginationQueryDto } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateOrderDto } from './shopping.dto';

const outOfStock = (title: string) =>
  new ConflictException({ code: 'OUT_OF_STOCK', message: `Not enough stock for "${title}"` });

@Injectable()
export class ShoppingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // --- Sevimlilar ---

  async findFavorites(userId: number) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => row.product);
  }

  async addFavorite(userId: number, productId: number) {
    const product = await this.getProduct(productId);
    await this.prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return product;
  }

  async removeFavorite(userId: number, productId: number) {
    await this.prisma.favorite.deleteMany({ where: { userId, productId } });
  }

  // --- Savat ---

  async getCart(userId: number) {
    const rows = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: { include: { category: true } } },
      orderBy: { id: 'asc' },
    });
    const items = rows.map(({ productId, quantity, product }) => ({
      productId,
      quantity,
      subtotal: product.price * quantity,
      product,
    }));
    return {
      items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: items.reduce((sum, item) => sum + item.subtotal, 0),
    };
  }

  async addToCart(userId: number, productId: number, quantity: number) {
    const product = await this.getProduct(productId);
    const existing = await this.prisma.cartItem.findUnique({ where: { userId_productId: { userId, productId } } });
    const next = (existing?.quantity ?? 0) + quantity;
    if (next > product.stock) throw outOfStock(product.title);

    await this.prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, quantity: next },
      update: { quantity: next },
    });
    return this.getCart(userId);
  }

  async setCartQuantity(userId: number, productId: number, quantity: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
      include: { product: true },
    });
    if (!item) throw new NotFoundException({ code: 'CART_ITEM_NOT_FOUND', message: 'Product is not in the cart' });
    if (quantity > item.product.stock) throw outOfStock(item.product.title);

    await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    return this.getCart(userId);
  }

  async removeFromCart(userId: number, productId: number) {
    await this.prisma.cartItem.deleteMany({ where: { userId, productId } });
    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
  }

  // --- Buyurtmalar ---

  async createOrder(userId: number, dto: CreateOrderDto) {
    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cartItem.findMany({ where: { userId }, include: { product: true } });
      if (!cart.length) throw new BadRequestException({ code: 'CART_EMPTY', message: 'Cart is empty' });

      for (const { product, quantity } of cart) {
        // Shart update ichida: ikki buyurtma bir vaqtda oxirgi mahsulotni ololmasin
        const { count } = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (!count) throw outOfStock(product.title);
      }

      const order = await tx.order.create({
        data: {
          userId,
          ...dto,
          total: cart.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0),
          items: {
            create: cart.map(({ product, quantity }) => ({
              productId: product.id,
              title: product.title,
              price: product.price,
              quantity,
            })),
          },
        },
        include: { items: true },
      });
      await tx.cartItem.deleteMany({ where: { userId } });
      return order;
    });
    this.realtime.toUserAndAdmins(userId, 'order:created', order);
    await this.broadcastStock(order.items);
    return order;
  }

  findOrders(query: PaginationQueryDto, userId?: number) {
    return this.listOrders(query, userId === undefined ? {} : { userId });
  }

  async getOrder(user: AuthUser, id: number) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    // Birovning buyurtmasi ham 404: mavjudligini oshkor qilmaslik uchun
    if (!order || (order.userId !== user.id && user.role !== Role.ADMIN)) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }
    return order;
  }

  async payOrder(user: AuthUser, id: number) {
    const order = await this.getOrder(user, id);
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException({ code: 'ORDER_NOT_PAYABLE', message: `Order is already ${order.status}` });
    }
    return this.setStatus(id, OrderStatus.PAID);
  }

  async cancelOrder(user: AuthUser, id: number) {
    const order = await this.getOrder(user, id);
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAID) {
      throw new ConflictException({
        code: 'ORDER_NOT_CANCELLABLE',
        message: `Order with status ${order.status} cannot be cancelled`,
      });
    }
    return this.setStatus(order.id, OrderStatus.CANCELLED);
  }

  async setStatusByAdmin(id: number, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException({ code: 'ORDER_CANCELLED', message: 'Cancelled order cannot be changed' });
    }
    return this.setStatus(id, status);
  }

  // Bekor qilinganda mahsulotlar omborga qaytadi
  private async setStatus(id: number, status: OrderStatus) {
    const order = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({ where: { id }, data: { status }, include: { items: true } });
      if (status === OrderStatus.CANCELLED) {
        for (const item of order.items) {
          if (item.productId === null) continue;
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
      }
      return order;
    });
    this.realtime.toUserAndAdmins(order.userId, 'order:updated', order);
    if (status === OrderStatus.CANCELLED) await this.broadcastStock(order.items);
    return order;
  }

  // Buyurtma ombordagi sonni o'zgartirganda hamma ochiq sahifalar yangi sonni ko'rsin
  private async broadcastStock(items: { productId: number | null }[]) {
    const ids = items.map((item) => item.productId).filter((id): id is number => id !== null);
    const stocks = await this.prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, stock: true } });
    this.realtime.toAll('product:stock', stocks);
  }

  private async listOrders({ page = 1, limit = 20 }: PaginationQueryDto, where: Prisma.OrderWhereInput) {
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  private async getProduct(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { category: true } });
    if (!product) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    return product;
  }
}
