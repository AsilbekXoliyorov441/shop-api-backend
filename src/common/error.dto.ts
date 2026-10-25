import { ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorDto {
  /** @example 422 */
  statusCode: number;
  /**
   * Dasturda tekshirish uchun barqaror kod
   * @example VALIDATION_ERROR
   */
  code: string;
  /** @example Validation failed */
  message: string;
  @ApiPropertyOptional({
    description: 'Faqat validatsiya xatosida: maydon nomi bo\'yicha xabarlar',
    example: { email: ['email must be an email'] },
  })
  errors?: Record<string, string[]>;
  path: string;
  timestamp: string;
}
