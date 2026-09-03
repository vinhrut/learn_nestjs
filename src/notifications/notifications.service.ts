import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, notification_type, notifications } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { REALTIME_EVENT } from '../realtime/realtime.constants';
import { QueryNotificationDto } from './dto/query-notification.dto';

export interface NotifyInput {
  userId: string;
  type: notification_type;
  title: string;
  message?: string;
  taskId?: string;
  extra?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * Ghi thông báo vào DB rồi đẩy realtime. Không bao giờ reject nên nơi gọi có
   * thể dùng `void` như MailService (thông báo hỏng không được làm hỏng request).
   */
  async notify(input: NotifyInput): Promise<void> {
    try {
      const notification = await this.prisma.notifications.create({
        data: {
          user_id: input.userId,
          task_id: input.taskId,
          type: input.type,
          title: input.title,
          message: input.message,
        },
      });
      this.emit(notification, input.extra);
    } catch (error) {
      this.logger.error(
        `Tạo thông báo thất bại (user=${input.userId}, type=${input.type}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Chỉ đẩy realtime cho một bản ghi đã tạo sẵn — dùng khi thông báo được ghi
   * bên trong transaction và chỉ được phép đẩy đi sau khi commit.
   */
  emit(notification: notifications, extra?: Record<string, unknown>): void {
    this.realtime.emitToUser(notification.user_id, REALTIME_EVENT.NOTIFICATION, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      taskId: notification.task_id,
      priority: null,
      dueDate: null,
      createdAt: notification.created_at,
      ...extra,
    });
  }

  /** Danh sách thông báo của user hiện tại (mới nhất trước), có phân trang. */
  async findMine(userId: string, query: QueryNotificationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.notificationsWhereInput = {
      user_id: userId,
      ...(query.unreadOnly ? { is_read: false } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notifications.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Số thông báo chưa đọc. */
  async unreadCount(userId: string) {
    const count = await this.prisma.notifications.count({
      where: { user_id: userId, is_read: false },
    });
    return { count };
  }

  /** Đánh dấu một thông báo là đã đọc (chỉ của chính user). */
  async markRead(id: string, userId: string) {
    const result = await this.prisma.notifications.updateMany({
      where: { id, user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });

    if (result.count === 0) {
      const exists = await this.prisma.notifications.findFirst({
        where: { id, user_id: userId },
        select: { id: true },
      });
      if (!exists) {
        throw new NotFoundException('Không tìm thấy thông báo');
      }
    }

    return { success: true };
  }

  /** Đánh dấu tất cả thông báo chưa đọc là đã đọc. */
  async markAllRead(userId: string) {
    const result = await this.prisma.notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    return { updated: result.count };
  }
}
