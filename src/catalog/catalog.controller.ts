import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Auth, AuthUser, CurrentUser } from '../common/auth';
import { ErrorDto } from '../common/error.dto';
import { PaginationQueryDto } from '../common/pagination.dto';
import { FILE_BODY_SCHEMA, imageUploadOptions, publicUrl, requireFile } from '../common/upload';
import {
  CategoryDto,
  CreateCategoryDto,
  CreateProductDto,
  CreateReviewDto,
  ProductDto,
  ProductListDto,
  ProductQueryDto,
  ReviewDto,
  ReviewListDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from './catalog.dto';
import { CatalogService } from './catalog.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly catalog: CatalogService) {}

  @ApiOperation({ summary: 'Barcha kategoriyalar' })
  @Get()
  findAll(): Promise<CategoryDto[]> {
    return this.catalog.findCategories();
  }

  @ApiOperation({ summary: 'Kategoriya qo\'shish (admin)' })
  @Auth(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateCategoryDto): Promise<CategoryDto> {
    return this.catalog.createCategory(dto);
  }

  @ApiOperation({ summary: 'Kategoriyani tahrirlash (admin)' })
  @Auth(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto): Promise<CategoryDto> {
    return this.catalog.updateCategory(id, dto);
  }

  @ApiOperation({ summary: 'Kategoriyani o\'chirish (admin). Ichida mahsulot bo\'lsa 409' })
  @Auth(Role.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.catalog.removeCategory(id);
  }

  @ApiOperation({ summary: 'Kategoriya rasmini yuklash (jpeg/png/webp/gif, ko\'pi bilan 2 MB). Eski rasm almashtiriladi' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY_SCHEMA)
  @Auth(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  @Post(':id/image')
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CategoryDto> {
    return this.catalog.setCategoryImage(id, publicUrl(requireFile(file).filename));
  }
}

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly catalog: CatalogService) {}

  @ApiOperation({ summary: 'Mahsulotlar ro\'yxati: pagination, qidiruv, filtr, saralash' })
  @Get()
  findAll(@Query() query: ProductQueryDto): Promise<ProductListDto> {
    return this.catalog.findProducts(query);
  }

  @ApiOperation({ summary: 'Bitta mahsulot' })
  @ApiNotFoundResponse({ type: ErrorDto, description: 'PRODUCT_NOT_FOUND' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ProductDto> {
    return this.catalog.getProduct(id);
  }

  @ApiOperation({ summary: 'Mahsulot qo\'shish (admin)' })
  @Auth(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateProductDto): Promise<ProductDto> {
    return this.catalog.createProduct(dto);
  }

  @ApiOperation({ summary: 'Mahsulotni tahrirlash (admin)' })
  @Auth(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto): Promise<ProductDto> {
    return this.catalog.updateProduct(id, dto);
  }

  @ApiOperation({ summary: 'Mahsulotni o\'chirish (admin)' })
  @Auth(Role.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.catalog.removeProduct(id);
  }

  @ApiOperation({ summary: 'Mahsulotga rasm qo\'shish (jpeg/png/webp/gif, ko\'pi bilan 2 MB). Ro\'yxat oxiriga qo\'shiladi, ko\'pi bilan 10 ta' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY_SCHEMA)
  @Auth(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  @Post(':id/images')
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ProductDto> {
    return this.catalog.addProductImage(id, publicUrl(requireFile(file).filename));
  }

  @ApiOperation({ summary: 'Mahsulot sharhlari' })
  @Get(':id/reviews')
  findReviews(@Param('id', ParseIntPipe) id: number, @Query() query: PaginationQueryDto): Promise<ReviewListDto> {
    return this.catalog.findReviews(id, query);
  }

  @ApiOperation({ summary: 'Sharh qoldirish. Har bir mahsulotga bitta sharh, takrori 409' })
  @Auth()
  @Post(':id/reviews')
  createReview(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewDto> {
    return this.catalog.createReview(user.id, id, dto);
  }
}

@ApiTags('Products')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly catalog: CatalogService) {}

  @ApiOperation({ summary: 'Sharhni o\'chirish (o\'zinikini yoki admin)' })
  @Auth()
  @HttpCode(204)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.catalog.removeReview(user, id);
  }
}
