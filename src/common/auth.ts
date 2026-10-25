import {
  applyDecorators,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiExtension, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ErrorDto } from './error.dto';
import { ROLES_EXTENSION } from './swagger';

export interface AuthUser {
  id: number;
  role: Role;
}

const ROLES_KEY = 'roles';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const [type, token] = (req.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException({ code: 'TOKEN_MISSING', message: 'Authorization header is missing' });
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; role: Role }>(token);
      req.user = { id: payload.sub, role: payload.role } satisfies AuthUser;
      return true;
    } catch (e) {
      const expired = e instanceof Error && e.name === 'TokenExpiredError';
      throw new UnauthorizedException(
        expired
          ? { code: 'TOKEN_EXPIRED', message: 'Access token has expired' }
          : { code: 'TOKEN_INVALID', message: 'Access token is invalid' },
      );
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const user: AuthUser = context.switchToHttp().getRequest().user;
    if (!roles.includes(user.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have permission for this action' });
    }
    return true;
  }
}

/** Token talab qiladi; rollar berilsa, faqat o'sha rollarga ruxsat */
export function Auth(...roles: Role[]) {
  const decorators = [
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiExtension(ROLES_EXTENSION, roles),
    ApiUnauthorizedResponse({
      type: ErrorDto,
      description: 'TOKEN_MISSING, TOKEN_INVALID yoki TOKEN_EXPIRED (refresh qiling)',
    }),
  ];
  if (roles.length) {
    decorators.push(ApiForbiddenResponse({ type: ErrorDto, description: `FORBIDDEN: faqat ${roles.join(', ')} uchun` }));
  }
  return applyDecorators(...decorators);
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => context.switchToHttp().getRequest().user,
);
