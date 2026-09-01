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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskHistoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TaskHistoryService = class TaskHistoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        return this.prisma.task_histories.create({
            data: {
                task_id: dto.taskId,
                actor_id: dto.actorId,
                action: dto.action,
                old_status: dto.oldStatus,
                new_status: dto.newStatus,
                old_assignee_id: dto.oldAssigneeId,
                new_assignee_id: dto.newAssigneeId,
                old_assigner_id: dto.oldAssignerId,
                new_assigner_id: dto.newAssignerId,
                comment: dto.comment,
                metadata: dto.metadata,
            },
        });
    }
    async findByTask(taskId) {
        return this.prisma.task_histories.findMany({
            where: {
                task_id: taskId,
            },
            orderBy: {
                created_at: 'asc',
            },
        });
    }
    async log(dto) {
        return this.create(dto);
    }
};
exports.TaskHistoryService = TaskHistoryService;
exports.TaskHistoryService = TaskHistoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TaskHistoryService);
//# sourceMappingURL=task-history.service.js.map