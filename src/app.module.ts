import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { CategoriesController, ProductsController, ReviewsController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { JwtAuthGuard, RolesGuard } from './common/auth';
import { LocationsController } from './locations/locations.controller';
import { PrismaModule, PrismaService } from './prisma/prisma.service';
import { RealtimeGateway } from './realtime/realtime.gateway';
import { SeedService } from './seed/seed.service';
import {
  AdminOrdersController,
  CartController,
  FavoritesController,
  OrdersController,
} from './shopping/shopping.controller';
import { ShoppingService } from './shopping/shopping.service';
import { UsersController } from './users/users.controller';

class HealthDto {
  /** @example ok */
  status: string;
  /** Server necha soniyadan beri ishlayapti */
  uptime: number;
}

@ApiTags('Health')
@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'Server va baza ishlayotganini tekshirish. Baza javob bermasa 503' })
  @SkipThrottle()
  @Get()
  async check(): Promise<HealthDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ code: 'DB_UNAVAILABLE', message: 'Database is not reachable' });
    }
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }
}

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: Number(process.env.RATE_LIMIT) || 600 }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: (process.env.ACCESS_TOKEN_TTL || '15m') as `${number}m` },
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    UsersController,
    CategoriesController,
    ProductsController,
    ReviewsController,
    LocationsController,
    FavoritesController,
    CartController,
    OrdersController,
    AdminOrdersController,
  ],
  providers: [
    AuthService,
    CatalogService,
    ShoppingService,
    SeedService,
    RealtimeGateway,
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
