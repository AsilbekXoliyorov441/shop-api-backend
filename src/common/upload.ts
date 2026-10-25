import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { ApiBodyOptions } from '@nestjs/swagger';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Kengaytma fayl nomidan emas, mimetype'dan olinadi: .html kabi fayl saqlanib qolmasin
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const imageUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, randomUUID() + EXTENSIONS[file.mimetype]),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) return cb(null, true);
    cb(
      new BadRequestException({
        code: 'INVALID_FILE_TYPE',
        message: 'Only jpeg, png, webp and gif images are allowed',
      }),
      false,
    );
  },
};

export const FILE_BODY_SCHEMA: ApiBodyOptions = {
  schema: {
    type: 'object',
    required: ['file'],
    properties: { file: { type: 'string', format: 'binary' } },
  },
};

export function requireFile(file?: Express.Multer.File): Express.Multer.File {
  if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Field "file" is required' });
  return file;
}

export function publicUrl(filename: string): string {
  const base = (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/uploads/${filename}`;
}
