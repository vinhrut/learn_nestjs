import { QueryNotificationDto } from './dto/query-notification.dto';
import { NotificationsService } from './notifications.service';
interface RequestUser {
    id: string;
}
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findMine(user: RequestUser, query: QueryNotificationDto): Promise<{
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
    unreadCount(user: RequestUser): Promise<{
        count: number;
    }>;
    markAllRead(user: RequestUser): Promise<{
        updated: number;
    }>;
    markRead(id: string, user: RequestUser): Promise<{
        success: boolean;
    }>;
}
export {};
