import { TaskHistoryService } from './task-history.service';
export declare class TaskHistoryController {
    private readonly taskHistoryService;
    constructor(taskHistoryService: TaskHistoryService);
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
}
