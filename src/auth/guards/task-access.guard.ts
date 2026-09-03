import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

interface RequestUser {
  id: string;
  roles: string[];
}

@Injectable()
export class TaskAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;

    if (!user) {
      throw new ForbiddenException('Phiên đăng nhập không hợp lệ');
    }

    const taskId = this.resolveTaskId(request);
    if (!taskId) {
      throw new NotFoundException('Không xác định được task');
    }

    const task = await this.prisma.tasks.findFirst({
      where: { id: taskId, deleted_at: null },
      select: { project_id: true },
    });
    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    const project = await this.prisma.projects.findFirst({
      where: {
        id: task.project_id,
        deleted_at: null,
        OR: [
          { owner_id: user.id },
          { project_members: { some: { user_id: user.id } } },
        ],
      },
      select: { id: true },
    });

    if (!project) {
      throw new ForbiddenException('Bạn không có quyền truy cập công việc này');
    }

    return true;
  }

  private resolveTaskId(request: Request): string | undefined {
    const body = request.body as { task_id?: unknown } | undefined;
    const candidates = [
      request.params?.taskId,
      request.params?.id,
      body?.task_id,
      request.query?.id_task,
    ];

    return candidates.find(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
  }
}
