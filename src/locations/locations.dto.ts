import { PartialType } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LocationDto {
  id: number;
  /** @example Chilonzor filiali */
  name: string;
  /** @example Toshkent */
  city: string;
  /** @example Chilonzor tumani, Bunyodkor shoh ko'chasi, 12-uy */
  address: string;
  /**
   * Kenglik (xaritada belgi qo'yish uchun)
   * @example 41.2856
   */
  latitude: number;
  /**
   * Uzunlik
   * @example 69.2034
   */
  longitude: number;
  /** @example +998712000001 */
  phone: string;
  /** @example 09:00–21:00 */
  workingHours: string;
  imageUrl: string | null;
  createdAt: Date;
}

export class LocationQueryDto {
  /**
   * Shahar bo'yicha filtr (katta-kichik harf farqsiz)
   * @example Toshkent
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  /** Nom yoki manzil bo'yicha qidiruv */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class CreateLocationDto {
  /** @example Sergeli filiali */
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  /** @example Toshkent */
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  city: string;

  /** @example Sergeli tumani, Yangi Sergeli ko'chasi, 5-uy */
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  address: string;

  /** @example 41.2265 */
  @IsLatitude()
  latitude: number;

  /** @example 69.2190 */
  @IsLongitude()
  longitude: number;

  /** @example +998712000009 */
  @Matches(/^\+998\d{9}$/, { message: 'phone must match +998XXXXXXXXX' })
  phone: string;

  /** @example 09:00–21:00 */
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  workingHours: string;
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}
