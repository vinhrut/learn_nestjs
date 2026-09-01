import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, task_priority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RealtimeService } from '../realtime/realtime.service';
import { REALTIME_EVENT } from '../realtime/realtime.constants';
import { CreateTaskDto } from './dto/create-task.dto';

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

@Injectable()
export class TaskVinhService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Admin tạo task và giao thẳng cho một user (assignment_status = ASSIGNED). */
  async createAndAssign(dto: CreateTaskDto, adminId: string) {
    const project = await this.prisma.projects.findFirst({
      where: { id: dto.projectId, deleted_at: null },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Không tìm thấy project');
    }

    const assignee = await this.prisma.users.findFirst({
      where: { id: dto.assigneeId, deleted_at: null },
      select: { id: true, email: true, full_name: true, status: true },
    });
    if (!assignee) {
      throw new NotFoundException('Không tìm thấy user được giao việc');
    }
    if (assignee.status !== 'ACTIVE') {
      throw new BadRequestException(
        'User được giao việc không ở trạng thái hoạt động',
      );
    }

    const priority = dto.priority ?? task_priority.MEDIUM;
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const { task, notification } = await this.prisma.$transaction(
      async (tx) => {
        const task = await tx.tasks.create({
          data: {
            project_id: dto.projectId,
            title: dto.title,
            description: dto.description,
            priority,
            due_date: dueDate,
            status: 'NEW',
            assignment_status: 'ASSIGNED',
            creator_id: adminId,
            assigner_id: adminId,
            assignee_id: dto.assigneeId,
          },
          ...taskCard,
        });

        await tx.task_histories.create({
          data: {
            task_id: task.id,
            actor_id: adminId,
            action: 'ASSIGNED',
            new_status: 'NEW',
            new_assignee_id: dto.assigneeId,
            new_assigner_id: adminId,
          },
        });

        const notification = await tx.notifications.create({
          data: {
            user_id: dto.assigneeId,
            task_id: task.id,
            type: 'TASK_ASSIGNED',
            title: 'Bạn được giao một công việc mới',
            message: task.title,
          },
        });

        return { task, notification };
      },
    );

    // Đẩy realtime + email SAU khi transaction commit. Không await email.
    this.realtime.emitToUser(dto.assigneeId, REALTIME_EVENT.NOTIFICATION, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      taskId: task.id,
      priority: task.priority,
      dueDate: task.due_date,
      createdAt: notification.created_at,
    });

    const assignerName =
      task.users_tasks_assigner_idTousers?.full_name ?? 'Quản trị viên';
    void this.mail.sendTaskAssignedEmail(assignee.email, {
      taskTitle: task.title,
      assignerName,
      priority: task.priority,
      dueDate: task.due_date?.toISOString(),
      full_name: assignee.full_name ?? undefined,
    });

    return this.toCard(task);
  }

  /** Danh sách task đang được giao cho user hiện tại. */
  async listAssignedToMe(userId: string) {
    const tasks = await this.prisma.tasks.findMany({
      where: { assignee_id: userId, deleted_at: null },
      orderBy: { created_at: 'desc' },
      ...taskCard,
    });
    return tasks.map((task) => this.toCard(task));
  }

  /** Danh sách project để đổ vào form giao việc (admin). */
  listProjects() {
    return this.prisma.projects.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, code: true },
      orderBy: { code: 'asc' },
    });
  }

  /** Danh sách toàn bộ task (admin) — phục vụ kiểm thử. */
  async listAll() {
    const tasks = await this.prisma.tasks.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      ...taskCard,
    });
    return tasks.map((task) => this.toCard(task));
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
}
