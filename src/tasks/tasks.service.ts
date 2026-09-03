import {
  Injectable,
  Logger,
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
import { AssignTaskDto } from './dto/assign-task.dto';
import { Prisma, task_priority, task_status } from '@prisma/client';
import { JwtUser } from '../auth/types/jwt-payload.type';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

const taskCard = Prisma.validator<Prisma.tasksDefaultArgs>()({
  include: {
    projects: { select: { id: true, name: true, code: true } },
    users_tasks_assignee_idTousers: {
      select: { id: true, full_name: true, email: true },
    },
    users_tasks_assigner_idTousers: {
      select: { id: true, full_name: true, email: true },
    },
  },
});
type TaskCard = Prisma.tasksGetPayload<typeof taskCard>;

interface AssignableTask {
  id: string;
  title: string;
  priority: task_priority;
  due_date: Date | null;
}

/** Ràng buộc quan hệ giữa người thao tác và task (LEAD được miễn). */
type TransitionOwnership = 'creator' | 'creator_or_assignee' | 'any';

interface TransitionRule {
  to: task_status;
  roles: string[];
  ownership: TransitionOwnership;
}

// Status Transition Matrix
// ADMIN không tham gia luồng task (chỉ quản lý tài khoản) nên không có mặt ở đây.
const STATUS_TRANSITIONS: Record<task_status, TransitionRule[]> = {
  // Gửi duyệt: chỉ người tạo task
  DRAFT: [
    {
      to: 'WAITING_APPROVAL',
      roles: ['BA', 'USER', 'LEAD'],
      ownership: 'creator',
    },
  ],
  // Duyệt / từ chối: chỉ Leader
  WAITING_APPROVAL: [
    { to: 'NEW', roles: ['LEAD'], ownership: 'any' },
    { to: 'REJECTED', roles: ['LEAD'], ownership: 'any' },
  ],
  NEW: [
    {
      to: 'DOING',
      roles: ['BA', 'USER', 'LEAD'],
      ownership: 'creator_or_assignee',
    },
    {
      to: 'WAITING_APPROVAL',
      roles: ['BA', 'USER', 'LEAD'],
      ownership: 'creator',
    },
  ],
  DOING: [
    {
      to: 'DONE',
      roles: ['BA', 'USER', 'LEAD'],
      ownership: 'creator_or_assignee',
    },
    {
      to: 'NEW',
      roles: ['BA', 'USER', 'LEAD'],
      ownership: 'creator_or_assignee',
    },
  ],
  // Đóng task / mở lại: chỉ Leader
  DONE: [
    { to: 'CLOSED', roles: ['LEAD'], ownership: 'any' },
    { to: 'DOING', roles: ['LEAD'], ownership: 'any' },
  ],
  CLOSED: [],
  // Gửi lại sau khi bị từ chối: chỉ người tạo
  REJECTED: [
    {
      to: 'WAITING_APPROVAL',
      roles: ['BA', 'USER', 'LEAD'],
      ownership: 'creator',
    },
    { to: 'DRAFT', roles: ['BA', 'USER', 'LEAD'], ownership: 'creator' },
  ],
};

/** Nhãn tiếng Việt của trạng thái, dùng cho thông báo lỗi gửi về giao diện. */
const STATUS_LABEL: Record<task_status, string> = {
  DRAFT: 'Nháp',
  WAITING_APPROVAL: 'Chờ duyệt',
  NEW: 'Mới',
  DOING: 'Đang làm',
  DONE: 'Hoàn thành',
  CLOSED: 'Đã đóng',
  REJECTED: 'Bị từ chối',
};

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

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
    userRoles: string[],
    isCreator: boolean,
    isAssignee: boolean,
  ): boolean {
    const rule = STATUS_TRANSITIONS[currentStatus]?.find(
      (item) => item.to === newStatus,
    );
    if (!rule) return false;

    // Xét TOÀN BỘ role của user, không chỉ role đầu tiên.
    if (!rule.roles.some((role) => userRoles.includes(role))) {
      return false;
    }

    // Leader điều phối cả bảng nên không bị ràng buộc creator/assignee.
    if (userRoles.includes('LEAD')) return true;

    if (rule.ownership === 'creator') return isCreator;
    if (rule.ownership === 'creator_or_assignee') return isCreator || isAssignee;
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
  // HELPER: Notify assignee (notification + realtime + mail)
  // =====================================================
  private assignedNotificationData(taskId: string, assigneeId: string, title: string) {
    return {
      user_id: assigneeId,
      task_id: taskId,
      type: 'TASK_ASSIGNED' as const,
      title: 'Bạn được giao một công việc mới',
      message: title,
    };
  }

  private async sendAssignedMail(
    task: AssignableTask,
    assigneeId: string,
    actorId: string,
  ): Promise<void> {
    try {
      const [assignee, actor] = await Promise.all([
        this.prisma.users.findFirst({
          where: { id: assigneeId, deleted_at: null },
          select: { email: true, full_name: true },
        }),
        this.prisma.users.findUnique({
          where: { id: actorId },
          select: { full_name: true, email: true },
        }),
      ]);
      if (!assignee) return;

      void this.mail.sendTaskAssignedEmail(assignee.email, {
        taskTitle: task.title,
        assignerName: actor?.full_name ?? actor?.email ?? 'Quản trị viên',
        priority: task.priority,
        dueDate: task.due_date?.toISOString(),
        full_name: assignee.full_name ?? undefined,
      });
    } catch (error) {
      this.logger.error(
        `Không gửi được mail giao việc (task=${task.id}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async notifyAssignee(
    task: AssignableTask,
    assigneeId: string,
    actorId: string,
  ): Promise<void> {
    if (assigneeId === actorId) return;

    try {
      const notification = await this.prisma.notifications.create({
        data: this.assignedNotificationData(task.id, assigneeId, task.title),
      });
      this.notifications.emit(notification, {
        priority: task.priority,
        dueDate: task.due_date,
      });
    } catch (error) {
      this.logger.error(
        `Không tạo được thông báo giao việc (task=${task.id}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    await this.sendAssignedMail(task, assigneeId, actorId);
  }

  private toCard(task: TaskCard) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      assignmentStatus: task.assignment_status,
      dueDate: task.due_date,
      createdAt: task.created_at,
      project: task.projects,
      assignee: task.users_tasks_assignee_idTousers,
      assigner: task.users_tasks_assigner_idTousers,
    };
  }

  // =====================================================
  // ASSIGN TASK (Leader tạo và giao thẳng)
  // =====================================================
  async assign(dto: AssignTaskDto, user: JwtUser) {
    const project = await this.prisma.projects.findFirst({
      where: { id: dto.projectId, deleted_at: null },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Không tìm thấy dự án');
    }

    const hasAccess = await this.checkProjectAccess(dto.projectId, user);
    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập dự án này');
    }

    const assignee = await this.prisma.users.findFirst({
      where: { id: dto.assigneeId, deleted_at: null },
      select: { id: true, status: true },
    });
    if (!assignee) {
      throw new NotFoundException('Không tìm thấy người được giao việc');
    }
    if (assignee.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Người được giao việc không ở trạng thái hoạt động',
      );
    }

    const priority = dto.priority ?? task_priority.MEDIUM;
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const { task, notification } = await this.prisma.$transaction(async (tx) => {
      const task = await tx.tasks.create({
        data: {
          project_id: dto.projectId,
          title: dto.title,
          description: dto.description,
          priority,
          due_date: dueDate,
          status: 'NEW',
          assignment_status: 'ASSIGNED',
          creator_id: user.id,
          assigner_id: user.id,
          assignee_id: dto.assigneeId,
        },
        ...taskCard,
      });

      await tx.task_histories.create({
        data: {
          task_id: task.id,
          actor_id: user.id,
          action: 'ASSIGNED',
          new_status: 'NEW',
          new_assignee_id: dto.assigneeId,
          new_assigner_id: user.id,
        },
      });

      const notification =
        dto.assigneeId === user.id
          ? null
          : await tx.notifications.create({
              data: this.assignedNotificationData(
                task.id,
                dto.assigneeId,
                task.title,
              ),
            });

      return { task, notification };
    });

    // Đẩy realtime + email SAU khi transaction commit. Không await email.
    if (notification) {
      this.notifications.emit(notification, {
        priority: task.priority,
        dueDate: task.due_date,
      });
      void this.sendAssignedMail(task, dto.assigneeId, user.id);
    }

    return this.toCard(task);
  }

  // =====================================================
  // GET TASKS ASSIGNED TO ME
  // =====================================================
  async listAssignedToMe(userId: string) {
    const tasks = await this.prisma.tasks.findMany({
      where: { assignee_id: userId, deleted_at: null },
      orderBy: { created_at: 'desc' },
      ...taskCard,
    });
    return tasks.map((task) => this.toCard(task));
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
        throw new ForbiddenException('Bạn không có quyền truy cập dự án này');
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

    // Mọi role chỉ thấy task thuộc project mình là owner/thành viên.
    // Quan hệ tới project trên model `tasks` tên là `projects` (xem schema.prisma).
    where.projects = {
      deleted_at: null,
      project_members: {
        some: { user_id: user.id },
      },
    };

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
      throw new ForbiddenException('Bạn không có quyền truy cập dự án này');
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
      throw new NotFoundException('Không tìm thấy công việc');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập công việc này');
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
      throw new ForbiddenException('Bạn không có quyền truy cập dự án này');
    }

    // Giao việc là quyền của Leader — BA/DEV tạo task ở dạng chưa giao.
    if (dto.assignee_id && !user.roles.includes('LEAD')) {
      throw new ForbiddenException('Chỉ Leader mới được giao việc');
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
        assigner_id: dto.assignee_id ? user.id : null,
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

    if (dto.assignee_id) {
      await this.notifyAssignee(task, dto.assignee_id, user.id);
    }

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
      throw new NotFoundException('Không tìm thấy công việc');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập công việc này');
    }

    const isLead = user.roles.includes('LEAD');

    // Leader sửa mọi task chưa đóng; người tạo chỉ sửa khi task chưa qua duyệt.
    // Người được giao thì đổi trạng thái chứ không sửa nội dung.
    const creatorCanEdit =
      task.creator_id === user.id &&
      (task.status === 'DRAFT' || task.status === 'REJECTED');
    if (!isLead && !creatorCanEdit) {
      throw new ForbiddenException(
        'Bạn không có quyền sửa công việc này',
      );
    }

    // Không thể sửa công việc đã đóngs
    if (task.status === 'CLOSED') {
      throw new BadRequestException('Không thể sửa công việc đã đóng');
    }

    // Giao việc là quyền của Leader.
    const isReassigning =
      dto.assignee_id !== undefined && dto.assignee_id !== task.assignee_id;
    if (isReassigning && !isLead) {
      throw new ForbiddenException('Chỉ Leader mới được giao việc');
    }

    const updatedTask = await this.prisma.tasks.update({
      where: { id: taskId },
      data: {
        title: dto.title ?? task.title,
        description: dto.description ?? task.description,
        priority: dto.priority ?? task.priority,
        due_date: dto.due_date ? new Date(dto.due_date) : task.due_date,
        assignee_id: dto.assignee_id ?? task.assignee_id,
        assigner_id: isReassigning ? user.id : task.assigner_id,
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

    if (isReassigning && updatedTask.assignee_id) {
      await this.notifyAssignee(updatedTask, updatedTask.assignee_id, user.id);
    }

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
      throw new NotFoundException('Không tìm thấy công việc');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập công việc này');
    }

    // Leader xoá được task trong project của mình;
    // người tạo chỉ xoá được khi task chưa qua duyệt.
    const creatorCanDelete =
      task.creator_id === user.id &&
      (task.status === 'DRAFT' || task.status === 'REJECTED');
    if (!user.roles.includes('LEAD') && !creatorCanDelete) {
      throw new ForbiddenException(
        'Bạn không có quyền xoá công việc này',
      );
    }

    // Soft delete
    await this.prisma.tasks.update({
      where: { id: taskId },
      data: { deleted_at: new Date() },
    });

    return { message: 'Đã xoá công việc' };
  }

  // =====================================================
  // UPDATE STATUS (Drag & Drop)
  // =====================================================
  async updateStatus(taskId: string, dto: UpdateTaskStatusDto, user: JwtUser) {
    const task = await this.prisma.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập công việc này');
    }

    const currentStatus = task.status;
    const newStatus = dto.status;
    const isCreator = task.creator_id === user.id;
    const isAssignee = task.assignee_id === user.id;

    // Check transition permission
    if (
      !this.canTransition(
        currentStatus,
        newStatus,
        user.roles,
        isCreator,
        isAssignee,
      )
    ) {
      throw new ForbiddenException(
        `Không thể chuyển công việc từ "${STATUS_LABEL[currentStatus]}" sang "${STATUS_LABEL[newStatus]}"`,
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
      throw new NotFoundException('Không tìm thấy công việc');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập công việc này');
    }

    // Only creator can submit
    if (task.creator_id !== user.id) {
      throw new ForbiddenException('Chỉ người tạo mới được gửi duyệt công việc');
    }

    // Can only submit DRAFT tasks
    if (task.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ công việc ở trạng thái Nháp mới gửi duyệt được');
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
      throw new ForbiddenException('Chỉ Trưởng nhóm mới được duyệt công việc');
    }

    const task = await this.prisma.tasks.findUnique({
      where: { id: dto.task_id },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập công việc này');
    }

    // Can only approve WAITING_APPROVAL tasks
    if (task.status !== 'WAITING_APPROVAL') {
      throw new BadRequestException(
        'Chỉ công việc đang chờ duyệt mới được phê duyệt',
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
      throw new ForbiddenException('Chỉ Trưởng nhóm mới được từ chối công việc');
    }

    const task = await this.prisma.tasks.findUnique({
      where: { id: dto.task_id },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    // Check project access
    const hasAccess = await this.checkProjectAccess(task.project_id, user);
    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập công việc này');
    }

    // Can only reject WAITING_APPROVAL tasks
    if (task.status !== 'WAITING_APPROVAL') {
      throw new BadRequestException(
        'Chỉ công việc đang chờ duyệt mới được từ chối',
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
