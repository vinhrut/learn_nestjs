import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskHistoryDto } from './dto/create-task-history.dto';

@Injectable()
export class TaskHistoryService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateTaskHistoryDto) {
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
    async findByTask(taskId: string) {
        return this.prisma.task_histories.findMany({
            where: { task_id: taskId },
            orderBy: { created_at: 'asc' },
        })
    }
}