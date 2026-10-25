import { ApiProperty } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PageMetaDto } from '../common/pagination.dto';

// passwordHash hech qachon tashqariga chiqmasligi uchun barcha so'rovlarda shu select ishlatiladi
export const userSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
  _count: { select: { orders: true } },
} satisfies Prisma.UserSelect;

type SelectedUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

// Buyurtmalarning o'zi javobga qo'shilmaydi (ular alohida, sahifalangan endpointlarda), faqat soni
export function toUserDto({ _count, ...user }: SelectedUser): UserDto {
  return { ...user, ordersCount: _count.orders };
}

export class UserDto {
  id: number;
  /** @example user@shop.uz */
  email: string;
  name: string;
  avatarUrl: string | null;
  @ApiProperty({ enum: Role })
  role: Role;
  createdAt: Date;
  /** Buyurtmalar soni. Ro'yxatning o'zi: `GET /orders` (o'ziniki) yoki `GET /admin/users/{id}/orders` */
  ordersCount: number;
}

export class UserListDto {
  data: UserDto[];
  meta: PageMetaDto;
}

export class UpdateProfileDto {
  /** @example Ali Valiyev */
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;
}
