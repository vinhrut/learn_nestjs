import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskHistoryDto } from './dto/create-task-history.dto';
export declare class TaskHistoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateTaskHistoryDto): Promise<{
        id: string;
        created_at: Date;
        task_id: string;
        action: import("@prisma/client").$Enums.history_action;
        old_status: import("@prisma/client").$Enums.task_status | null;
        new_status: import("@prisma/client").$Enums.task_status | null;
        comment: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        old_assignee_id: string | null;
        new_assignee_id: string | null;
        old_assigner_id: string | null;
        new_assigner_id: string | null;
        actor_id: string;
    }>;
    findByTask(taskId: string): Promise<{
        id: string;
        created_at: Date;
        task_id: string;
        action: import("@prisma/client").$Enums.history_action;
        old_status: import("@prisma/client").$Enums.task_status | null;
        new_status: import("@prisma/client").$Enums.task_status | null;
        comment: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        old_assignee_id: string | null;
        new_assignee_id: string | null;
        old_assigner_id: string | null;
        new_assigner_id: string | null;
        actor_id: string;
    }[]>;
    log(dto: CreateTaskHistoryDto): Promise<{
        id: string;
        created_at: Date;
        task_id: string;
        action: import("@prisma/client").$Enums.history_action;
        old_status: import("@prisma/client").$Enums.task_status | null;
        new_status: import("@prisma/client").$Enums.task_status | null;
        comment: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        old_assignee_id: string | null;
        new_assignee_id: string | null;
        old_assigner_id: string | null;
        new_assigner_id: string | null;
        actor_id: string;
    }>;
}
