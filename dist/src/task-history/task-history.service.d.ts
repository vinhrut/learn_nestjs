import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskHistoryDto } from './dto/create-task-history.dto';
export declare class TaskHistoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateTaskHistoryDto): Promise<{
        id: string;
        created_at: Date;
        action: import("@prisma/client").$Enums.history_action;
        old_status: import("@prisma/client").$Enums.task_status | null;
        new_status: import("@prisma/client").$Enums.task_status | null;
        comment: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        task_id: string;
        actor_id: string;
        old_assignee_id: string | null;
        new_assignee_id: string | null;
        old_assigner_id: string | null;
        new_assigner_id: string | null;
    }>;
    findByTask(taskId: string): Promise<{
        id: string;
        created_at: Date;
        action: import("@prisma/client").$Enums.history_action;
        old_status: import("@prisma/client").$Enums.task_status | null;
        new_status: import("@prisma/client").$Enums.task_status | null;
        comment: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        task_id: string;
        actor_id: string;
        old_assignee_id: string | null;
        new_assignee_id: string | null;
        old_assigner_id: string | null;
        new_assigner_id: string | null;
    }[]>;
    log(dto: CreateTaskHistoryDto): Promise<{
        id: string;
        created_at: Date;
        action: import("@prisma/client").$Enums.history_action;
        old_status: import("@prisma/client").$Enums.task_status | null;
        new_status: import("@prisma/client").$Enums.task_status | null;
        comment: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        task_id: string;
        actor_id: string;
        old_assignee_id: string | null;
        new_assignee_id: string | null;
        old_assigner_id: string | null;
        new_assigner_id: string | null;
    }>;
}
