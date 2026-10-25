import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { DEMO_USERS, SEED_CATEGORIES, SEED_LOCATIONS, SEED_PRODUCTS } from './seed-data';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Faqat bo'sh bazada ishlaydi: mavjud ma'lumotlarga hech qachon tegmaydi
  async onApplicationBootstrap() {
    for (const { password, ...user } of DEMO_USERS) {
      const exists = await this.prisma.user.findUnique({ where: { email: user.email } });
      if (!exists) await this.prisma.user.create({ data: { ...user, passwordHash: await hash(password, 10) } });
    }

    if ((await this.prisma.location.count()) === 0) {
      await this.prisma.location.createMany({ data: SEED_LOCATIONS });
      this.logger.log(`Seeded ${SEED_LOCATIONS.length} locations`);
    }

    const [categories, products] = await Promise.all([this.prisma.category.count(), this.prisma.product.count()]);
    if (categories || products) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.category.createMany({ data: SEED_CATEGORIES });
      await tx.product.createMany({ data: SEED_PRODUCTS });
      // Aniq id bilan yozilgani uchun autoincrement hisoblagichlarini to'g'rilash kerak
      for (const table of ['Category', 'Product']) {
        await tx.$queryRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), (SELECT MAX(id) FROM "${table}"))`,
        );
      }
    });
    this.logger.log(`Seeded ${SEED_CATEGORIES.length} categories, ${SEED_PRODUCTS.length} products`);
  }
}
