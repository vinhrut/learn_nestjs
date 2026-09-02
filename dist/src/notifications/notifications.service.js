"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const realtime_service_1 = require("../realtime/realtime.service");
const realtime_constants_1 = require("../realtime/realtime.constants");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    prisma;
    realtime;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(prisma, realtime) {
        this.prisma = prisma;
        this.realtime = realtime;
    }
    async notify(input) {
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
        }
        catch (error) {
            this.logger.error(`Tạo thông báo thất bại (user=${input.userId}, type=${input.type}): ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    emit(notification, extra) {
        this.realtime.emitToUser(notification.user_id, realtime_constants_1.REALTIME_EVENT.NOTIFICATION, {
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
    async findMine(userId, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = {
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
    async unreadCount(userId) {
        const count = await this.prisma.notifications.count({
            where: { user_id: userId, is_read: false },
        });
        return { count };
    }
    async markRead(id, userId) {
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
                throw new common_1.NotFoundException('Không tìm thấy thông báo');
            }
        }
        return { success: true };
    }
    async markAllRead(userId) {
        const result = await this.prisma.notifications.updateMany({
            where: { user_id: userId, is_read: false },
            data: { is_read: true, read_at: new Date() },
        });
        return { updated: result.count };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        realtime_service_1.RealtimeService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map