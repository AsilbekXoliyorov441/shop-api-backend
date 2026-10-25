import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { UserDto } from '../users/users.dto';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  /** @example user@shop.uz */
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  /** @example user123 */
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;
}

export class RegisterDto extends LoginDto {
  /** @example Ali Valiyev */
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class TokensDto {
  /** Qisqa muddatli JWT. `Authorization: Bearer <accessToken>` sarlavhasida yuboriladi */
  accessToken: string;
  /** Uzoq muddatli, bir martalik token. `/auth/refresh` ga yuboriladi va har safar yangilanadi */
  refreshToken: string;
}

export class AuthResponseDto extends TokensDto {
  user: UserDto;
}
