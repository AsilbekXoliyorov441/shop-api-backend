import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Auth, AuthUser, CurrentUser } from '../common/auth';
import { paginate, PaginationQueryDto } from '../common/pagination.dto';
import { FILE_BODY_SCHEMA, imageUploadOptions, publicUrl, requireFile } from '../common/upload';
import { PrismaService } from '../prisma/prisma.service';
import { OrderListDto } from '../shopping/shopping.dto';
import { ShoppingService } from '../shopping/shopping.service';
import { toUserDto, UpdateProfileDto, UserDto, UserListDto, userSelect } from './users.dto';

@ApiTags('Users')
@Controller()
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shopping: ShoppingService,
  ) {}

  @ApiOperation({ summary: 'Profil ismini o\'zgartirish' })
  @Auth()
  @Patch('users/me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<UserDto> {
    return toUserDto(await this.prisma.user.update({ where: { id: user.id }, data: dto, select: userSelect }));
  }

  @ApiOperation({ summary: 'Avatar yuklash (jpeg/png/webp/gif, ko\'pi bilan 2 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY_SCHEMA)
  @Auth()
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  @Post('users/me/avatar')
  async uploadAvatar(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File): Promise<UserDto> {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: publicUrl(requireFile(file).filename) },
      select: userSelect,
    });
    return toUserDto(updated);
  }

  @ApiOperation({ summary: 'Barcha foydalanuvchilar' })
  @Auth(Role.ADMIN)
  @Get('admin/users')
  async findAll(@Query() { page = 1, limit = 20 }: PaginationQueryDto): Promise<UserListDto> {
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        select: userSelect,
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);
    return paginate(data.map(toUserDto), total, page, limit);
  }

  @ApiOperation({ summary: 'Bitta foydalanuvchi' })
  @Auth(Role.ADMIN)
  @Get('admin/users/:id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    return toUserDto(user);
  }

  @ApiOperation({ summary: 'Foydalanuvchining buyurtmalari (yangisi birinchi)' })
  @Auth(Role.ADMIN)
  @Get('admin/users/:id/orders')
  async findOrders(@Param('id', ParseIntPipe) id: number, @Query() query: PaginationQueryDto): Promise<OrderListDto> {
    await this.findOne(id);
    return this.shopping.findOrders(query, id);
  }
}
