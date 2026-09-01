import { PrismaService } from '../prisma/prisma.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findMine(userId: string, query: QueryNotificationDto): Promise<{
        data: {
            id: string;
            created_at: Date;
            user_id: string;
            task_id: string | null;
            type: import("@prisma/client").$Enums.notification_type;
            title: string;
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
