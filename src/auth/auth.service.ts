import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { toUserDto, userSelect } from '../users/users.dto';
import { LoginDto, RegisterDto } from './auth.dto';

const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 30;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' });

    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash: await hash(dto.password, 10) },
      select: userSelect,
    });
    return { user: toUserDto(user), ...(await this.issueTokens(user.id, user.role)) };
  }

  async login(dto: LoginDto) {
    const found = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { ...userSelect, passwordHash: true },
    });
    if (!found || !(await compare(dto.password, found.passwordHash))) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' });
    }
    const { passwordHash: _, ...user } = found;
    return { user: toUserDto(user), ...(await this.issueTokens(user.id, user.role)) };
  }

  // Refresh token bir martalik: ishlatilgani o'chiriladi va yangisi beriladi
  async refresh(refreshToken: string) {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (stored) await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_INVALID',
        message: 'Refresh token is invalid or expired',
      });
    }
    return this.issueTokens(stored.user.id, stored.user.role);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: sha256(refreshToken) } });
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!user) throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'User no longer exists' });
    return toUserDto(user);
  }

  private async issueTokens(userId: number, role: Role) {
    // Eskirgan tokenlar jadvalda to'planib qolmasin
    await this.prisma.refreshToken.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
    const refreshToken = randomBytes(40).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken: await this.jwt.signAsync({ sub: userId, role }), refreshToken };
  }
}
