import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsInt, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ProductDto } from '../catalog/catalog.dto';
import { PageMetaDto } from '../common/pagination.dto';

export class CartItemDto {
  productId: number;
  quantity: number;
  /** price * quantity */
  subtotal: number;
  product: ProductDto;
}

export class CartDto {
  items: CartItemDto[];
  /** Barcha mahsulotlar soni (quantity yig'indisi) */
  totalItems: number;
  totalPrice: number;
}

export class AddCartItemDto {
  /** @example 1 */
  @IsInt()
  productId: number;

  /**
   * Savatdagi mavjud songa qo'shiladi
   * @example 1
   */
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}

export class UpdateCartItemDto {
  /**
   * Yangi son (qo'shilmaydi, almashtiriladi)
   * @example 3
   */
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}

export class OrderItemDto {
  id: number;
  /** Mahsulot keyinchalik o'chirilgan bo'lsa null */
  productId: number | null;
  /** Buyurtma paytidagi nom */
  title: string;
  /** Buyurtma paytidagi narx */
  price: number;
  quantity: number;
}

export class OrderDto {
  id: number;
  userId: number;
  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;
  total: number;
  address: string;
  phone: string;
  createdAt: Date;
  items: OrderItemDto[];
}

export class OrderListDto {
  data: OrderDto[];
  meta: PageMetaDto;
}

export class CreateOrderDto {
  /** @example Toshkent sh., Chilonzor 5-mavze, 12-uy */
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  address: string;

  /** @example +998901234567 */
  @Matches(/^\+998\d{9}$/, { message: 'phone must match +998XXXXXXXXX' })
  phone: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
