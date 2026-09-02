import { TasksService } from './tasks.service';
import type { JwtUser } from '../auth/types/jwt-payload.type';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/task-status.dto';
import { SubmitTaskDto } from './dto/task-id.dto';
import { ApproveTaskDto } from './dto/task-id.dto';
import { RejectTaskDto } from './dto/task-id.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    findAll(query: QueryTaskDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_assignee_idTousers: {
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
        status: import("@prisma/client").$Enums.task_status;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        project_id: string;
        title: string;
        priority: import("@prisma/client").$Enums.task_priority;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
    }[]>;
    findByProject(projectId: string, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_assignee_idTousers: {
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
        status: import("@prisma/client").$Enums.task_status;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        project_id: string;
        title: string;
        priority: import("@prisma/client").$Enums.task_priority;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
    }[]>;
    assignedToMe(user: JwtUser): Promise<{
        id: string;
        title: string;
        description: string | null;
        priority: import("@prisma/client").$Enums.task_priority;
        status: import("@prisma/client").$Enums.task_status;
        assignmentStatus: import("@prisma/client").$Enums.assignment_status;
        dueDate: Date | null;
        createdAt: Date;
        project: {
            id: string;
            code: string;
            name: string;
        };
        assignee: {
            id: string;
            email: string;
            full_name: string | null;
        } | null;
        assigner: {
            id: string;
            email: string;
            full_name: string | null;
        } | null;
    }[]>;
    assign(dto: AssignTaskDto, user: JwtUser): Promise<{
        id: string;
        title: string;
        description: string | null;
        priority: import("@prisma/client").$Enums.task_priority;
        status: import("@prisma/client").$Enums.task_status;
        assignmentStatus: import("@prisma/client").$Enums.assignment_status;
        dueDate: Date | null;
        createdAt: Date;
        project: {
            id: string;
            code: string;
            name: string;
        };
        assignee: {
            id: string;
            email: string;
            full_name: string | null;
        } | null;
        assigner: {
            id: string;
            email: string;
            full_name: string | null;
        } | null;
    }>;
    findOne(taskId: string, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_assignee_idTousers: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        } | null;
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
        status: import("@prisma/client").$Enums.task_status;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        project_id: string;
        title: string;
        priority: import("@prisma/client").$Enums.task_priority;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
    }>;
    create(projectId: string, dto: CreateTaskDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_assignee_idTousers: {
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
        status: import("@prisma/client").$Enums.task_status;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        project_id: string;
        title: string;
        priority: import("@prisma/client").$Enums.task_priority;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
    }>;
    update(taskId: string, dto: UpdateTaskDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_assignee_idTousers: {
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
        status: import("@prisma/client").$Enums.task_status;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        project_id: string;
        title: string;
        priority: import("@prisma/client").$Enums.task_priority;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
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
        users_tasks_assignee_idTousers: {
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
        status: import("@prisma/client").$Enums.task_status;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        project_id: string;
        title: string;
        priority: import("@prisma/client").$Enums.task_priority;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
    }>;
    submit(dto: SubmitTaskDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_assignee_idTousers: {
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
        status: import("@prisma/client").$Enums.task_status;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        project_id: string;
        title: string;
        priority: import("@prisma/client").$Enums.task_priority;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
    }>;
    approve(dto: ApproveTaskDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_assignee_idTousers: {
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
        status: import("@prisma/client").$Enums.task_status;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        project_id: string;
        title: string;
        priority: import("@prisma/client").$Enums.task_priority;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
    }>;
    reject(dto: RejectTaskDto, user: JwtUser): Promise<{
        code: string;
        projects: {
            id: string;
            code: string;
            name: string;
        };
        users_tasks_assignee_idTousers: {
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
        status: import("@prisma/client").$Enums.task_status;
        id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        project_id: string;
        title: string;
        priority: import("@prisma/client").$Enums.task_priority;
        due_date: Date | null;
        board_position: number;
        assignment_status: import("@prisma/client").$Enums.assignment_status;
        creator_id: string;
        assigner_id: string | null;
        assignee_id: string | null;
    }>;
}
