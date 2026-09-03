import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { task_status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TasksService } from '../tasks/tasks.service';
import { JwtUser } from '../auth/types/jwt-payload.type';
import { CreateExtensionDto } from './dto/create-extension.dto';
import {
  ApproveExtensionDto,
  RejectExtensionDto,
} from './dto/review-extension.dto';
import { extensionRequestArgs, toExtensionCard } from './extension.mapper';

const REQUESTABLE_STATUSES: task_status[] = ['NEW', 'DOING'];

@Injectable()
export class TaskExtensionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly tasks: TasksService,
  ) {}

  private formatDate(value: Date): string {
    return value.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  }

  private async findTaskOrFail(taskId: string, user: JwtUser) {
    const task = await this.prisma.tasks.findFirst({
      where: { id: taskId, deleted_at: null },
      include: { projects: { select: { id: true, owner_id: true } } },
    });
    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    const hasAccess = await this.tasks.checkProjectAccess(
      task.project_id,
      user,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập công việc này');
    }

    return task;
  }

  private async findPendingRequestOrFail(requestId: string, user: JwtUser) {
    const request = await this.prisma.task_extension_requests.findUnique({
      where: { id: requestId },
      include: {
        tasks: {
          select: { id: true, title: true, project_id: true, due_date: true },
        },
      },
    });
    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu gia hạn');
    }

    const hasAccess = await this.tasks.checkProjectAccess(
      request.tasks.project_id,
      user,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập công việc này');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Yêu cầu gia hạn này đã được xử lý');
    }

    return request;
  }

  async create(dto: CreateExtensionDto, user: JwtUser) {
    const task = await this.findTaskOrFail(dto.task_id, user);

    if (task.assignee_id !== user.id) {
      throw new ForbiddenException(
        'Chỉ người được giao việc mới được xin gia hạn',
      );
    }

    if (!REQUESTABLE_STATUSES.includes(task.status)) {
      throw new BadRequestException(
        'Chỉ công việc ở trạng thái "Mới" hoặc "Đang làm" mới xin gia hạn được',
      );
    }

    if (!task.due_date) {
      throw new BadRequestException('Công việc chưa có hạn chót để gia hạn');
    }

    const requestedDueDate = new Date(dto.requested_due_date);
    if (requestedDueDate <= task.due_date) {
      throw new BadRequestException('Ngày gia hạn phải sau hạn chót hiện tại');
    }

    const pending = await this.prisma.task_extension_requests.findFirst({
      where: { task_id: task.id, status: 'PENDING' },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException(
        'Công việc này đang có một yêu cầu gia hạn chờ duyệt',
      );
    }

    const request = await this.prisma.task_extension_requests.create({
      data: {
        task_id: task.id,
        requester_id: user.id,
        current_due_date: task.due_date,
        requested_due_date: requestedDueDate,
        reason: dto.reason,
      },
      ...extensionRequestArgs,
    });

    const reviewerIds = new Set(
      [task.assigner_id, task.projects.owner_id].filter(
        (id): id is string => !!id && id !== user.id,
      ),
    );
    for (const reviewerId of reviewerIds) {
      void this.notifications.notify({
        userId: reviewerId,
        taskId: task.id,
        type: 'DEADLINE_EXTENSION_REQUEST',
        title: 'Có yêu cầu gia hạn công việc',
        message: `${task.title}: xin dời hạn chót sang ${this.formatDate(requestedDueDate)}`,
        extra: { dueDate: task.due_date },
      });
    }

    return toExtensionCard(request);
  }

  async approve(dto: ApproveExtensionDto, user: JwtUser) {
    const request = await this.findPendingRequestOrFail(dto.request_id, user);

    const oldDueDate = request.tasks.due_date;
    const newDueDate = request.requested_due_date;

    const updated = await this.prisma.$transaction(async (tx) => {
      const reviewed = await tx.task_extension_requests.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          reviewed_by: user.id,
          reviewed_at: new Date(),
        },
        ...extensionRequestArgs,
      });

      await tx.tasks.update({
        where: { id: request.task_id },
        data: { due_date: newDueDate },
      });

      await tx.task_histories.create({
        data: {
          task_id: request.task_id,
          actor_id: user.id,
          action: 'UPDATED',
          comment: request.reason,
          metadata: {
            kind: 'DEADLINE_EXTENSION',
            request_id: request.id,
            old_due_date: oldDueDate?.toISOString() ?? null,
            new_due_date: newDueDate.toISOString(),
          },
        },
      });

      return reviewed;
    });

    void this.notifications.notify({
      userId: request.requester_id,
      taskId: request.task_id,
      type: 'DEADLINE_EXTENSION_APPROVED',
      title: 'Yêu cầu gia hạn đã được duyệt',
      message: `${request.tasks.title}: hạn chót mới là ${this.formatDate(newDueDate)}`,
      extra: { dueDate: newDueDate },
    });

    return toExtensionCard(updated);
  }

  async reject(dto: RejectExtensionDto, user: JwtUser) {
    const request = await this.findPendingRequestOrFail(dto.request_id, user);

    const updated = await this.prisma.$transaction(async (tx) => {
      const reviewed = await tx.task_extension_requests.update({
        where: { id: request.id },
        data: {
          status: 'REJECTED',
          reviewed_by: user.id,
          reviewed_at: new Date(),
          reject_reason: dto.reason,
        },
        ...extensionRequestArgs,
      });

      await tx.task_histories.create({
        data: {
          task_id: request.task_id,
          actor_id: user.id,
          action: 'REJECTED',
          comment: dto.reason,
          metadata: {
            kind: 'DEADLINE_EXTENSION',
            request_id: request.id,
            requested_due_date: request.requested_due_date.toISOString(),
          },
        },
      });

      return reviewed;
    });

    void this.notifications.notify({
      userId: request.requester_id,
      taskId: request.task_id,
      type: 'DEADLINE_EXTENSION_REJECTED',
      title: 'Yêu cầu gia hạn bị từ chối',
      message: dto.reason
        ? `${request.tasks.title}: ${dto.reason}`
        : `${request.tasks.title}: hạn chót được giữ nguyên`,
      extra: { dueDate: request.tasks.due_date },
    });

    return toExtensionCard(updated);
  }

  async listByTask(taskId: string, user: JwtUser) {
    await this.findTaskOrFail(taskId, user);

    const requests = await this.prisma.task_extension_requests.findMany({
      where: { task_id: taskId },
      orderBy: { created_at: 'desc' },
      ...extensionRequestArgs,
    });

    return requests.map((request) => toExtensionCard(request));
  }
}
