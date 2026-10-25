import 'dotenv/config';
import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { Logger, UnprocessableEntityException, ValidationError, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cors from 'cors';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { corsOrigin } from './common/cors';
import { sandboxMiddleware } from './common/sandbox.middleware';
import { setupSwagger } from './common/swagger';
import { UPLOAD_DIR } from './common/upload';

// { "items.0.quantity": ["..."] } ko'rinishidagi tekis xatolar ro'yxati
function flattenErrors(list: ValidationError[], prefix = '', out: Record<string, string[]> = {}) {
  for (const e of list) {
    const key = prefix + e.property;
    if (e.constraints) out[key] = Object.values(e.constraints);
    if (e.children?.length) flattenErrors(e.children, `${key}.`, out);
  }
  return out;
}

function corsOptions(): cors.CorsOptions {
  return {
    origin: corsOrigin(),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    // Brauzer JS'i standart bo'yicha bu sarlavhalarni o'qiy olmaydi
    exposedHeaders: ['Retry-After', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    // Preflight (OPTIONS) javobi brauzerda 1 soat keshlanadi
    maxAge: 3600,
  };
}

function assertEnv() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  // Serverda namunadagi yoki qisqa kalit bilan ishga tushmasin: uni bilgan har kim ADMIN token yasay oladi
  if (process.env.NODE_ENV === 'production' && (secret === 'change-me' || secret.length < 32)) {
    throw new Error('JWT_SECRET is too weak: use at least 32 characters (openssl rand -hex 32)');
  }
}

async function bootstrap() {
  assertEnv();
  mkdirSync(UPLOAD_DIR, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  // docker stop (SIGTERM) kelganda ulanishlar va Prisma to'g'ri yopiladi
  app.enableShutdownHooks();
  // CORS birinchi turishi shart: undan keyingi har qanday javob (sun'iy xato, 429) ham CORS sarlavhalarini oladi
  app.use(cors(corsOptions()));
  app.use(sandboxMiddleware);
  app.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads' });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: flattenErrors(errors),
        }),
    }),
  );

  setupSwagger(app);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`API: http://localhost:${port}/api, Swagger: http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap();
