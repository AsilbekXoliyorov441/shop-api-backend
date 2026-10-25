import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Role } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../common/auth';
import { corsOrigin } from '../common/cors';

const ADMINS_ROOM = 'admins';
const userRoom = (userId: number) => `user:${userId}`;

/**
 * Socket.IO server. Faqat serverdan klientga xabar yuboradi.
 * Tokensiz ulangan mehmon ochiq hodisalarni (product:*) oladi; token bilan ulangan
 * foydalanuvchi o'z buyurtmalari hodisalarini, ADMIN esa barcha buyurtmalarnikini oladi.
 */
@WebSocketGateway({ cors: { origin: corsOrigin() } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server: Server;

  constructor(private readonly jwt: JwtService) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      const token = socket.handshake.auth?.token ?? socket.handshake.query?.token;
      if (!token) return next();
      try {
        const payload = await this.jwt.verifyAsync<{ sub: number; role: Role }>(String(token));
        socket.data.user = { id: payload.sub, role: payload.role } satisfies AuthUser;
        next();
      } catch (e) {
        // Klientda connect_error hodisasida err.message sifatida keladi
        next(new Error(e instanceof Error && e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'));
      }
    });
  }

  handleConnection(socket: Socket) {
    const user: AuthUser | undefined = socket.data.user;
    if (user) {
      socket.join(userRoom(user.id));
      if (user.role === Role.ADMIN) socket.join(ADMINS_ROOM);
    }
    socket.emit('connected', { authenticated: !!user, user: user ?? null });
  }

  /** Hamma ulangan klientlarga */
  toAll(event: string, payload: unknown) {
    this.emit(() => this.server.emit(event, payload));
  }

  /** Bitta foydalanuvchiga (barcha qurilmalariga) va barcha adminlarga */
  toUserAndAdmins(userId: number, event: string, payload: unknown) {
    this.emit(() => this.server.to(userRoom(userId)).to(ADMINS_ROOM).emit(event, payload));
  }

  // Xabar yuborishdagi xato asosiy so'rovni (masalan, buyurtma yaratishni) buzmasligi kerak
  private emit(send: () => void) {
    try {
      send();
    } catch (e) {
      this.logger.error(e instanceof Error ? e.stack : e);
    }
  }
}
