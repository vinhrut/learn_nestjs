import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/task-status.dto';
import { SubmitTaskDto } from './dto/task-id.dto';
import { ApproveTaskDto } from './dto/task-id.dto';
import { RejectTaskDto } from './dto/task-id.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { JwtUser } from '../auth/types/jwt-payload.type';
export declare class TasksService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private checkProjectAccess;
    private canTransition;
    private getTaskWithRelations;
    private logHistory;
    findAll(query: QueryTaskDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_creator_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        };
        users_tasks_assignee_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        } | null;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        status: import("@prisma/client").$Enums.task_status;
        deleted_at: Date | null;
        priority: import("@prisma/client").$Enums.task_priority;
        title: string;
        project_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
    }[]>;
    findByProject(projectId: string, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_creator_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        };
        users_tasks_assignee_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        } | null;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        status: import("@prisma/client").$Enums.task_status;
        deleted_at: Date | null;
        priority: import("@prisma/client").$Enums.task_priority;
        title: string;
        project_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
    }[]>;
    findOne(taskId: string, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_assigner_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        } | null;
        users_tasks_creator_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        };
        users_tasks_assignee_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        } | null;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        status: import("@prisma/client").$Enums.task_status;
        deleted_at: Date | null;
        priority: import("@prisma/client").$Enums.task_priority;
        title: string;
        project_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
    }>;
    create(projectId: string, dto: CreateTaskDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_creator_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        };
        users_tasks_assignee_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        } | null;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        status: import("@prisma/client").$Enums.task_status;
        deleted_at: Date | null;
        priority: import("@prisma/client").$Enums.task_priority;
        title: string;
        project_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
    }>;
    update(taskId: string, dto: UpdateTaskDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_creator_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        };
        users_tasks_assignee_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        } | null;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        status: import("@prisma/client").$Enums.task_status;
        deleted_at: Date | null;
        priority: import("@prisma/client").$Enums.task_priority;
        title: string;
        project_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
    }>;
    delete(taskId: string, user: JwtUser): Promise<{
        message: string;
    }>;
    updateStatus(taskId: string, dto: UpdateTaskStatusDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_creator_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        };
        users_tasks_assignee_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        } | null;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        status: import("@prisma/client").$Enums.task_status;
        deleted_at: Date | null;
        priority: import("@prisma/client").$Enums.task_priority;
        title: string;
        project_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
    }>;
    submit(dto: SubmitTaskDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_creator_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        };
        users_tasks_assignee_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        } | null;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        status: import("@prisma/client").$Enums.task_status;
        deleted_at: Date | null;
        priority: import("@prisma/client").$Enums.task_priority;
        title: string;
        project_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
    }>;
    approve(dto: ApproveTaskDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_creator_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        };
        users_tasks_assignee_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        } | null;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        status: import("@prisma/client").$Enums.task_status;
        deleted_at: Date | null;
        priority: import("@prisma/client").$Enums.task_priority;
        title: string;
        project_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
    }>;
    reject(dto: RejectTaskDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_creator_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        };
        users_tasks_assignee_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        } | null;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        status: import("@prisma/client").$Enums.task_status;
        deleted_at: Date | null;
        priority: import("@prisma/client").$Enums.task_priority;
        title: string;
        project_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
    }>;
}
