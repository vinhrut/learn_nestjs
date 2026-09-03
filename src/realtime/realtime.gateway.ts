import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { REALTIME_NAMESPACE, userRoom } from './realtime.constants';

/**
 * Gateway socket.io dùng chung cho toàn app.
 *
 * Chỉ có chiều server -> client: client kết nối, xác thực bằng access token trong
 * handshake, rồi được đưa vào room `user:<id>`. Việc phát event do `RealtimeService`
 * đảm nhiệm để code nghiệp vụ không phụ thuộc trực tiếp vào socket.io.
 */
@WebSocketGateway({
  namespace: REALTIME_NAMESPACE,
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Xác thực token ngay ở bước handshake — kết nối sai token bị chặn trước khi mở. */
  afterInit(server: Server): void {
    server.use((client: Socket, next: (err?: Error) => void) => {
      try {
        const token = this.extractToken(client);
        if (!token) {
          throw new Error('Thiếu access token');
        }
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        });
        client.data.userId = payload.sub;
        next();
      } catch (error) {
        this.logger.warn(
          `Từ chối handshake socket ${client.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        next(new Error('unauthorized'));
      }
    });
  }

  handleConnection(client: Socket): void {
    const userId = client.data.userId as string;
    void client.join(userRoom(userId));
    this.logger.log(`Socket ${client.id} đã kết nối (user=${userId})`);
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data?.userId as string | undefined;
    this.logger.log(
      `Socket ${client.id} đã ngắt kết nối${userId ? ` (user=${userId})` : ''}`,
    );
  }

  /** Lấy token từ `auth.token` (ưu tiên) hoặc header `Authorization: Bearer`. */
  private extractToken(client: Socket): string | undefined {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    if (fromAuth) {
      return fromAuth.replace(/^Bearer\s+/i, '');
    }
    const header = client.handshake.headers.authorization;
    if (header) {
      return header.replace(/^Bearer\s+/i, '');
    }
    return undefined;
  }
}
