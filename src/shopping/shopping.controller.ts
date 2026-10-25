import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProductDto } from '../catalog/catalog.dto';
import { Auth, AuthUser, CurrentUser } from '../common/auth';
import { ErrorDto } from '../common/error.dto';
import { PaginationQueryDto } from '../common/pagination.dto';
import {
  AddCartItemDto,
  CartDto,
  CreateOrderDto,
  OrderDto,
  OrderListDto,
  UpdateCartItemDto,
  UpdateOrderStatusDto,
} from './shopping.dto';
import { ShoppingService } from './shopping.service';

@ApiTags('Favorites')
@Auth()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly shopping: ShoppingService) {}

  @ApiOperation({ summary: 'Sevimli mahsulotlarim' })
  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<ProductDto[]> {
    return this.shopping.findFavorites(user.id);
  }

  @ApiOperation({ summary: 'Sevimlilarga qo\'shish (takror chaqirilsa ham xato bermaydi)' })
  @Post(':productId')
  add(@CurrentUser() user: AuthUser, @Param('productId', ParseIntPipe) productId: number): Promise<ProductDto> {
    return this.shopping.addFavorite(user.id, productId);
  }

  @ApiOperation({ summary: 'Sevimlilardan olib tashlash' })
  @HttpCode(204)
  @Delete(':productId')
  remove(@CurrentUser() user: AuthUser, @Param('productId', ParseIntPipe) productId: number): Promise<void> {
    return this.shopping.removeFavorite(user.id, productId);
  }
}

@ApiTags('Cart')
@Auth()
@Controller('cart')
export class CartController {
  constructor(private readonly shopping: ShoppingService) {}

  @ApiOperation({ summary: 'Savatim' })
  @Get()
  get(@CurrentUser() user: AuthUser): Promise<CartDto> {
    return this.shopping.getCart(user.id);
  }

  @ApiOperation({ summary: 'Savatga qo\'shish. Javobda yangilangan savat qaytadi' })
  @ApiConflictResponse({ type: ErrorDto, description: 'OUT_OF_STOCK' })
  @HttpCode(200)
  @Post('items')
  add(@CurrentUser() user: AuthUser, @Body() dto: AddCartItemDto): Promise<CartDto> {
    return this.shopping.addToCart(user.id, dto.productId, dto.quantity);
  }

  @ApiOperation({ summary: 'Savatdagi mahsulot sonini o\'zgartirish' })
  @ApiConflictResponse({ type: ErrorDto, description: 'OUT_OF_STOCK' })
  @Patch('items/:productId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartDto> {
    return this.shopping.setCartQuantity(user.id, productId, dto.quantity);
  }

  @ApiOperation({ summary: 'Mahsulotni savatdan olib tashlash' })
  @Delete('items/:productId')
  remove(@CurrentUser() user: AuthUser, @Param('productId', ParseIntPipe) productId: number): Promise<CartDto> {
    return this.shopping.removeFromCart(user.id, productId);
  }

  @ApiOperation({ summary: 'Savatni tozalash' })
  @HttpCode(204)
  @Delete()
  clear(@CurrentUser() user: AuthUser): Promise<void> {
    return this.shopping.clearCart(user.id);
  }
}

@ApiTags('Orders')
@Auth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly shopping: ShoppingService) {}

  @ApiOperation({
    summary: 'Savatdan buyurtma yaratish',
    description: 'Savatdagi hamma narsa buyurtmaga o\'tadi, savat bo\'shaydi, ombordagi son kamayadi.',
  })
  @ApiConflictResponse({ type: ErrorDto, description: 'OUT_OF_STOCK' })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto): Promise<OrderDto> {
    return this.shopping.createOrder(user.id, dto);
  }

  @ApiOperation({ summary: 'Buyurtmalarim' })
  @Get()
  findMine(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto): Promise<OrderListDto> {
    return this.shopping.findOrders(query, user.id);
  }

  @ApiOperation({ summary: 'Bitta buyurtma' })
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<OrderDto> {
    return this.shopping.getOrder(user, id);
  }

  @ApiOperation({ summary: 'To\'lash (soxta to\'lov): PENDING → PAID' })
  @HttpCode(200)
  @Post(':id/pay')
  pay(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<OrderDto> {
    return this.shopping.payOrder(user, id);
  }

  @ApiOperation({ summary: 'Bekor qilish. Faqat PENDING yoki PAID holatida' })
  @HttpCode(200)
  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<OrderDto> {
    return this.shopping.cancelOrder(user, id);
  }
}

@ApiTags('Orders')
@Auth(Role.ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly shopping: ShoppingService) {}

  @ApiOperation({ summary: 'Barcha buyurtmalar (admin)' })
  @Get()
  findAll(@Query() query: PaginationQueryDto): Promise<OrderListDto> {
    return this.shopping.findOrders(query);
  }

  @ApiOperation({ summary: 'Buyurtma statusini o\'zgartirish (admin)' })
  @Patch(':id/status')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto): Promise<OrderDto> {
    return this.shopping.setStatusByAdmin(id, dto.status);
  }
}
