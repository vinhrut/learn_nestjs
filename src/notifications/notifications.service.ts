import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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
