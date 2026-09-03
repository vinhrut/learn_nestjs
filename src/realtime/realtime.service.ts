import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { userRoom } from './realtime.constants';

/**
 * API generic để code nghiệp vụ đẩy event realtime xuống một / nhiều user mà
 * không cần biết tới socket.io. Lỗi socket được nuốt + log để không làm vỡ luồng
 * gọi (giống tinh thần fire-and-forget của `MailService`).
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  /** Đẩy `event` kèm `payload` tới tất cả socket đang mở của một user. */
  emitToUser(userId: string, event: string, payload: unknown): void {
    try {
      this.gateway.server.to(userRoom(userId)).emit(event, payload);
    } catch (error) {
      this.logger.error(
        `Không đẩy được event realtime (user=${userId}, event=${event}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Như `emitToUser` nhưng cho nhiều user cùng lúc. */
  emitToUsers(userIds: string[], event: string, payload: unknown): void {
    for (const userId of userIds) {
      this.emitToUser(userId, event, payload);
    }
  }
}
