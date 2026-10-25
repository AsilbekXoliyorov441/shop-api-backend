import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PageMetaDto, PaginationQueryDto } from '../common/pagination.dto';

export class CategoryDto {
  id: number;
  /** @example Telefonlar */
  name: string;
  /** @example telefonlar */
  slug: string;
  imageUrl: string | null;
}

export class CreateCategoryDto {
  /** @example Aksessuarlar */
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  /** @example aksessuarlar */
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug may contain only a-z, 0-9 and hyphens' })
  @MaxLength(50)
  slug: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class ProductDto {
  id: number;
  title: string;
  description: string;
  /** Narx, so'mda */
  price: number;
  /** Chegirmadan oldingi narx (bo'lmasa null) */
  oldPrice: number | null;
  /** Ombordagi soni */
  stock: number;
  images: string[];
  /** O'rtacha baho, 0–5 */
  ratingAvg: number;
  ratingCount: number;
  categoryId: number;
  category: CategoryDto;
  createdAt: Date;
}

export class ProductListDto {
  data: ProductDto[];
  meta: PageMetaDto;
}

export const PRODUCT_SORTS = ['createdAt', '-createdAt', 'price', '-price', 'rating', '-rating', 'title', '-title'];

export class ProductQueryDto extends PaginationQueryDto {
  /** Nom yoki tavsif bo'yicha qidiruv */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  /**
   * Kategoriya slug'i
   * @example telefonlar
   */
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  /** true bo'lsa, faqat omborda bor mahsulotlar */
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  inStock?: boolean;

  /** Saralash. Minus belgisi kamayish tartibini bildiradi */
  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort?: string = '-createdAt';
}

export class CreateProductDto {
  /** @example Samsung Galaxy A55 */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  /** @example 4500000 */
  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  oldPrice?: number;

  /** @example 10 */
  @IsInt()
  @Min(0)
  stock: number;

  /** @example 1 */
  @IsInt()
  categoryId: number;

  /** Rasm URL'lari. Fayl yuklash uchun `POST /products/{id}/images` */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ require_tld: false }, { each: true })
  images?: string[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ReviewAuthorDto {
  id: number;
  name: string;
  avatarUrl: string | null;
}

export class ReviewDto {
  id: number;
  rating: number;
  text: string;
  productId: number;
  userId: number;
  user: ReviewAuthorDto;
  createdAt: Date;
}

export class ReviewListDto {
  data: ReviewDto[];
  meta: PageMetaDto;
}

export class CreateReviewDto {
  /** @example 5 */
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  /** @example Juda yaxshi mahsulot, tavsiya qilaman */
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  text: string;
}
