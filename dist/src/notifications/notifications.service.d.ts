import { notification_type, notifications } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
export interface NotifyInput {
    userId: string;
    type: notification_type;
    title: string;
    message?: string;
    taskId?: string;
    extra?: Record<string, unknown>;
}
export declare class NotificationsService {
    private readonly prisma;
    private readonly realtime;
    private readonly logger;
    constructor(prisma: PrismaService, realtime: RealtimeService);
    notify(input: NotifyInput): Promise<void>;
    emit(notification: notifications, extra?: Record<string, unknown>): void;
    findMine(userId: string, query: QueryNotificationDto): Promise<{
        data: {
            id: string;
            created_at: Date;
            user_id: string;
            title: string;
            task_id: string | null;
            type: import("@prisma/client").$Enums.notification_type;
            message: string | null;
            is_read: boolean;
            read_at: Date | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    unreadCount(userId: string): Promise<{
        count: number;
    }>;
    markRead(id: string, userId: string): Promise<{
        success: boolean;
    }>;
    markAllRead(userId: string): Promise<{
        updated: number;
    }>;
}
