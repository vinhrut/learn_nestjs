import { history_action, task_status } from '@prisma/client';

export class CreateTaskHistoryDto {
    taskId!: string;
    actorId!: string;
    action!: history_action;

    oldStatus?: task_status;
    newStatus?: task_status;

    oldAssigneeId?: string;
    newAssigneeId?: string;

    oldAssignerId?: string;
    newAssignerId?: string;

    comment?: string;
    metadata?: Record<string, any>;
}