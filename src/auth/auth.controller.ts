import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Auth, AuthUser, CurrentUser } from '../common/auth';
import { ErrorDto } from '../common/error.dto';
import { UserDto } from '../users/users.dto';
import { AuthResponseDto, LoginDto, RefreshDto, RegisterDto, TokensDto } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOperation({ summary: 'Ro\'yxatdan o\'tish' })
  @ApiConflictResponse({ type: ErrorDto, description: 'EMAIL_TAKEN' })
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @ApiOperation({ summary: 'Kirish' })
  @ApiUnauthorizedResponse({ type: ErrorDto, description: 'INVALID_CREDENTIALS' })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @ApiOperation({
    summary: 'Tokenlarni yangilash',
    description: 'Eski refresh token bekor bo\'ladi, javobdagi yangisini saqlab qo\'ying.',
  })
  @ApiUnauthorizedResponse({ type: ErrorDto, description: 'REFRESH_TOKEN_INVALID' })
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto): Promise<TokensDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Chiqish (refresh tokenni bekor qilish)' })
  @HttpCode(204)
  @Post('logout')
  logout(@Body() dto: RefreshDto): Promise<void> {
    return this.auth.logout(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Joriy foydalanuvchi' })
  @Auth()
  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return this.auth.me(user.id);
  }
}
