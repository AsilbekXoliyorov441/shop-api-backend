import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { Prisma, Role } from '@prisma/client';
import { Auth } from '../common/auth';
import { FILE_BODY_SCHEMA, imageUploadOptions, publicUrl, requireFile } from '../common/upload';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto, LocationDto, LocationQueryDto, UpdateLocationDto } from './locations.dto';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'Barcha filiallar. Shahar bo\'yicha filtr va qidiruv bilan' })
  @Get()
  findAll(@Query() query: LocationQueryDto): Promise<LocationDto[]> {
    const where: Prisma.LocationWhereInput = {};
    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.location.findMany({ where, orderBy: { id: 'asc' } });
  }

  @ApiOperation({ summary: 'Bitta filial' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<LocationDto> {
    return this.get(id);
  }

  @ApiOperation({ summary: 'Filial qo\'shish' })
  @Auth(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateLocationDto): Promise<LocationDto> {
    return this.prisma.location.create({ data: dto });
  }

  @ApiOperation({ summary: 'Filialni tahrirlash' })
  @Auth(Role.ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLocationDto): Promise<LocationDto> {
    await this.get(id);
    return this.prisma.location.update({ where: { id }, data: dto });
  }

  @ApiOperation({ summary: 'Filialni o\'chirish' })
  @Auth(Role.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.get(id);
    await this.prisma.location.delete({ where: { id } });
  }

  @ApiOperation({ summary: 'Filial rasmini yuklash (jpeg/png/webp/gif, ko\'pi bilan 2 MB). Eski rasm almashtiriladi' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY_SCHEMA)
  @Auth(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  @Post(':id/image')
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<LocationDto> {
    await this.get(id);
    return this.prisma.location.update({
      where: { id },
      data: { imageUrl: publicUrl(requireFile(file).filename) },
    });
  }

  private async get(id: number) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location) throw new NotFoundException({ code: 'LOCATION_NOT_FOUND', message: 'Location not found' });
    return location;
  }
}
