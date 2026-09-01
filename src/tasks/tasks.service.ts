import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/task-status.dto';
import { SubmitTaskDto } from './dto/task-id.dto';
import { ApproveTaskDto } from './dto/task-id.dto';
import { RejectTaskDto } from './dto/task-id.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { task_status } from '@prisma/client';
import { JwtUser } from '../auth/types/jwt-payload.type';

// Status Transition Matrix
const STATUS_TRANSITIONS: Record<
  task_status,
  { allowedStatuses: task_status[]; roles: string[] }
> = {
  DRAFT: {
    allowedStatuses: ['WAITING_APPROVAL'],
    roles: ['BA', 'ADMIN', 'USER', 'LEAD'],
  },
  WAITING_APPROVAL: {
    allowedStatuses: ['NEW', 'REJECTED'],
    roles: ['LEAD'],
  },
  NEW: {
    allowedStatuses: ['DOING', 'WAITING_APPROVAL'],
    roles: ['BA', 'ADMIN', 'USER', 'LEAD'],
  },
  DOING: {
    allowedStatuses: ['DONE', 'NEW'],
    roles: ['BA', 'ADMIN', 'USER', 'LEAD'],
  },
  DONE: {
    allowedStatuses: ['CLOSED', 'DOING'],
    roles: ['LEAD'],
  },
  CLOSED: {
    allowedStatuses: [],
    roles: [],
  },
  REJECTED: {
    allowedStatuses: ['WAITING_APPROVAL', 'DRAFT'],
    roles: ['BA', 'ADMIN', 'USER', 'LEAD'],
  },
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // HELPER: Check project access
  // =====================================================
  private async checkProjectAccess(
    projectId: string,
    user: JwtUser,
  ): Promise<boolean> {
    const project = await this.prisma.projects.findFirst({
      where: {
        id: projectId,
        deleted_at: null,
        OR: [
          { owner_id: user.id },
          { project_members: { some: { user_id: user.id } } },
        ],
      },
    });
    return !!project;
  }

  // =====================================================
  // HELPER: Check task transition permission
  // =====================================================
  private canTransition(
    currentStatus: task_status,
    newStatus: task_status,
    userRole: string,
    isCreator: boolean,
    isAssignee: boolean,
  ): boolean {
    const transition = STATUS_TRANSITIONS[currentStatus];
    if (!transition) return false;

    // Check if transition is allowed
    if (!transition.allowedStatuses.includes(newStatus)) {
      return false;
    }

    // Check role permission
    if (!transition.roles.includes(userRole)) {
      return false;
    }

    return true;
  }

  // =====================================================
  // HELPER: Get task with relations
  // =====================================================
  private async getTaskWithRelations(taskId: string) {
    return this.prisma.tasks.findUnique({
      where: { id: taskId },
      include: {
        users_tasks_creator_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        users_tasks_assignee_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        users_tasks_assigner_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        projects: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  // =====================================================
  // HELPER: Log task history
  // =====================================================
  private async logHistory(
    taskId: string,
    actorId: string,
    action:
      | 'CREATED'
      | 'UPDATED'
      | 'STATUS_CHANGED'
      | 'SUBMITTED'
      | 'APPROVED'
      | 'REJECTED',
    oldStatus?: task_status,
    newStatus?: task_status,
    comment?: string,
  ) {
    await this.prisma.task_histories.create({
      data: {
        task_id: taskId,
        actor_id: actorId,
        action,
        old_status: oldStatus,
        new_status: newStatus,
        comment,
      },
    });
  }

  // =====================================================
  // GET ALL TASKS (with filters)
  // =====================================================
  async findAll(query: QueryTaskDto, user: JwtUser) {
    const where: any = {
      deleted_at: null,
    };

    // Filter by project
    if (query.project_id) {
      // Check project access
      const hasAccess = await this.checkProjectAccess(query.project_id, user);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this project');
      }
      where.project_id = query.project_id;
    }

    // Filter by assignee
    if (query.assignee_id) {
      where.assignee_id = query.assignee_id;
    }

    // Filter by status
    if (query.status) {
      where.status = query.status;
    }

    // Filter by approval status
    if (query.approval_status) {
      where.assignment_status = query.approval_status;
    }

    // Search by title
    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    // Role-based filtering
    if (!user.roles.includes('LEAD') && !user.roles.includes('ADMIN')) {
      // Non-admin users see only their projects
      where.project = {
        deleted_at: null,
        project_members: {
          some: { user_id: user.id },
        },
      };
    }

    const tasks = await this.prisma.tasks.findMany({
      where,
      include: {
        users_tasks_creator_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        users_tasks_assignee_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        projects: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ board_position: 'asc' }, { created_at: 'desc' }],
    });

    // Generate code for each task
    return tasks.map((task, index) => ({
      ...task,
      code: `TSK-${String(index + 1).padStart(4, '0')}`,
    }));
  }

  // =====================================================
  // GET TASKS BY PROJECT
  // =====================================================
  async findByProject(projectId: string, user: JwtUser) {
    // Check project access
    const hasAccess = await this.checkProjectAccess(projectId, user);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const tasks = await this.prisma.tasks.findMany({
      where: {
        project_id: projectId,
        deleted_at: null,
      },
      include: {
        users_tasks_creator_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        users_tasks_assignee_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        projects: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ board_position: 'asc' }, { created_at: 'desc' }],
    });

    // Generate code for each task
    return tasks.map((task, index) => ({
      ...task,
      code: `TSK-${projectId.substring(0, 4).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
    }));
  }

  // =====================================================
  // GET ONE TASK
  // =====================================================
  async findOne(taskId: string, user: JwtUser) {
    const task = await this.getTaskWithRelations(taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    return {
      ...task,
      code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
    };
  }

  // =====================================================
  // CREATE TASK
  // =====================================================
  async create(projectId: string, dto: CreateTaskDto, user: JwtUser) {
    // Check project access
    const hasAccess = await this.checkProjectAccess(projectId, user);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Get max board_position
    const maxPosition = await this.prisma.tasks.aggregate({
      where: { project_id: projectId, deleted_at: null },
      _max: { board_position: true },
    });

    const newPosition = (maxPosition._max.board_position || 0) + 1;

    // Create task with DRAFT status
    const task = await this.prisma.tasks.create({
      data: {
        project_id: projectId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        status: 'DRAFT', // Always DRAFT on create
        due_date: dto.due_date ? new Date(dto.due_date) : null,
        creator_id: user.id,
        assignee_id: dto.assignee_id,
        board_position: newPosition,
      },
      include: {
        users_tasks_creator_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        users_tasks_assignee_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        projects: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Log history
    await this.logHistory(task.id, user.id, 'CREATED');

    return {
      ...task,
      code: `TSK-${projectId.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
    };
  }

  // =====================================================
  // UPDATE TASK
  // =====================================================
  async update(taskId: string, dto: UpdateTaskDto, user: JwtUser) {
    const task = await this.prisma.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    // Only creator, assignee, or LEAD can update
    if (
      task.creator_id !== user.id &&
      task.assignee_id !== user.id &&
      !user.roles.includes('LEAD')
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this task',
      );
    }

    // Cannot update closed tasks
    if (task.status === 'CLOSED') {
      throw new BadRequestException('Cannot update closed task');
    }

    const updatedTask = await this.prisma.tasks.update({
      where: { id: taskId },
      data: {
        title: dto.title ?? task.title,
        description: dto.description ?? task.description,
        priority: dto.priority ?? task.priority,
        due_date: dto.due_date ? new Date(dto.due_date) : task.due_date,
        assignee_id: dto.assignee_id ?? task.assignee_id,
      },
      include: {
        users_tasks_creator_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        users_tasks_assignee_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        projects: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Log history
    await this.logHistory(taskId, user.id, 'UPDATED');

    return {
      ...updatedTask,
      code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
    };
  }

  // =====================================================
  // DELETE TASK
  // =====================================================
  async delete(taskId: string, user: JwtUser) {
    const task = await this.prisma.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Only creator or LEAD can delete
    if (task.creator_id !== user.id && !user.roles.includes('LEAD')) {
      throw new ForbiddenException(
        'You do not have permission to delete this task',
      );
    }

    // Soft delete
    await this.prisma.tasks.update({
      where: { id: taskId },
      data: { deleted_at: new Date() },
    });

    return { message: 'Task deleted successfully' };
  }

  // =====================================================
  // UPDATE STATUS (Drag & Drop)
  // =====================================================
  async updateStatus(taskId: string, dto: UpdateTaskStatusDto, user: JwtUser) {
    const task = await this.prisma.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    const currentStatus = task.status;
    const newStatus = dto.status;
    const userRole = user.roles[0] || 'USER';
    const isCreator = task.creator_id === user.id;
    const isAssignee = task.assignee_id === user.id;

    // Check transition permission
    if (
      !this.canTransition(
        currentStatus,
        newStatus,
        userRole,
        isCreator,
        isAssignee,
      )
    ) {
      throw new ForbiddenException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }

    // Update status
    const updatedTask = await this.prisma.tasks.update({
      where: { id: taskId },
      data: {
        status: newStatus,
      },
      include: {
        users_tasks_creator_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        users_tasks_assignee_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        projects: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Log history
    await this.logHistory(
      taskId,
      user.id,
      'STATUS_CHANGED',
      currentStatus,
      newStatus,
    );

    return {
      ...updatedTask,
      code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
    };
  }

  // =====================================================
  // SUBMIT TASK (DRAFT -> WAITING_APPROVAL)
  // =====================================================
  async submit(dto: SubmitTaskDto, user: JwtUser) {
    const task = await this.prisma.tasks.findUnique({
      where: { id: dto.task_id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    // Only creator can submit
    if (task.creator_id !== user.id) {
      throw new ForbiddenException('Only task creator can submit');
    }

    // Can only submit DRAFT tasks
    if (task.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT tasks can be submitted');
    }

    // Update status to WAITING_APPROVAL
    const updatedTask = await this.prisma.tasks.update({
      where: { id: dto.task_id },
      data: { status: 'WAITING_APPROVAL' },
      include: {
        users_tasks_creator_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        users_tasks_assignee_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        projects: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Log history
    await this.logHistory(dto.task_id, user.id, 'SUBMITTED');

    return {
      ...updatedTask,
      code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
    };
  }

  // =====================================================
  // APPROVE TASK (WAITING_APPROVAL -> NEW)
  // =====================================================
  async approve(dto: ApproveTaskDto, user: JwtUser) {
    // Only LEAD can approve
    if (!user.roles.includes('LEAD')) {
      throw new ForbiddenException('Only Leader can approve tasks');
    }

    const task = await this.prisma.tasks.findUnique({
      where: { id: dto.task_id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    // Can only approve WAITING_APPROVAL tasks
    if (task.status !== 'WAITING_APPROVAL') {
      throw new BadRequestException(
        'Only tasks in WAITING_APPROVAL status can be approved',
      );
    }

    const oldStatus = task.status;

    // Update status to NEW
    const updatedTask = await this.prisma.tasks.update({
      where: { id: dto.task_id },
      data: {
        status: 'NEW',
        assignment_status: 'APPROVED',
      },
      include: {
        users_tasks_creator_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        users_tasks_assignee_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        projects: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Log history
    await this.logHistory(dto.task_id, user.id, 'APPROVED', oldStatus, 'NEW');

    return {
      ...updatedTask,
      code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
    };
  }

  // =====================================================
  // REJECT TASK (WAITING_APPROVAL -> REJECTED)
  // =====================================================
  async reject(dto: RejectTaskDto, user: JwtUser) {
    // Only LEAD can reject
    if (!user.roles.includes('LEAD')) {
      throw new ForbiddenException('Only Leader can reject tasks');
    }

    const task = await this.prisma.tasks.findUnique({
      where: { id: dto.task_id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    // Can only reject WAITING_APPROVAL tasks
    if (task.status !== 'WAITING_APPROVAL') {
      throw new BadRequestException(
        'Only tasks in WAITING_APPROVAL status can be rejected',
      );
    }

    const oldStatus = task.status;

    // Update status to REJECTED
    const updatedTask = await this.prisma.tasks.update({
      where: { id: dto.task_id },
      data: {
        status: 'REJECTED',
        assignment_status: 'REJECTED',
      },
      include: {
        users_tasks_creator_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        users_tasks_assignee_idTousers: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        projects: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Log history
    await this.logHistory(
      dto.task_id,
      user.id,
      'REJECTED',
      oldStatus,
      'REJECTED',
      dto.reason,
    );

    return {
      ...updatedTask,
      code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
    };
  }
}
