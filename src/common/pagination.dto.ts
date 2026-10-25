import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  /** Sahifa raqami, 1 dan boshlanadi */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** Bir sahifadagi elementlar soni (ko'pi bilan 100) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class PageMetaDto {
  page: number;
  limit: number;
  /** Filtrga mos barcha elementlar soni */
  total: number;
  totalPages: number;
}

export function paginate<T>(data: T[], total: number, page: number, limit: number) {
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
