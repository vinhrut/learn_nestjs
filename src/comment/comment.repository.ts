import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ICommentRepository } from './comment.interface';
import { CreateComment } from './comment.dto';
@Injectable()
export class CommentRepository implements ICommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<unknown[]> {
    return this.prisma.task_comments.findMany({
      where: {
        deleted_at: null,
      },
    });
  }
  async findOneComment(id: string): Promise<Record<string, unknown>[]> {
    return await this.prisma.users.findMany({
      where: {
        id: id,
        deleted_at: null,
      },
    });
  }

  async findByTaskId(
    taskId: string,
    projectId: string,
    skip: string,
    limit: string,
  ): Promise<{
    data: unknown[];
    totalPage: number;
  }> {
    const whereComment: Record<string, unknown> = {
      deleted_at: null,
    };

    const whereAttachment: Record<string, unknown> = {
      deleted_at: null,
    };

    if (taskId) {
      whereComment.task_id = taskId;
      whereAttachment.task_id = taskId;
    }
    if (projectId) {
      whereComment.project_id = projectId;
      whereAttachment.project_id = projectId;
    }
    const dataComment = await this.prisma.task_comments.findMany({
      where: whereComment,
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });

    // Lấy attachment
    const dataAttach = await this.prisma.attachments.findMany({
      where: whereAttachment,
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });

    // Gộp comment + attachment
    const data = [
      ...dataComment.map((item) => ({
        ...item,
      })),

      ...dataAttach.map((item) => ({
        ...item,
        size_bytes: item.size_bytes ? Number(item.size_bytes) : null,
      })),
    ].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    // Phân trang
    const page = Math.max(Number(skip) || 1, 1);
    const pageSize = Math.max(Number(limit) || 10, 1);

    const totalPage = Math.ceil(data.length / pageSize);

    const skipPage = (page - 1) * pageSize;

    const result = data.slice(skipPage, skipPage + pageSize);

    return {
      data: result,
      totalPage,
    };
  }
  async create(dto: CreateComment & { user_id: string }): Promise<unknown> {
    try {
      console.log(dto.user_id);

      if (!dto.user_id || !dto.content || !dto.type) {
        return { error: 'Dữ liệu truyền vào thiếu' };
      }

      // Phải có task_id hoặc project_id
      if (!dto.task_id && !dto.project_id) {
        return { error: 'Phải có task_id hoặc project_id' };
      }

      // Không được có cả hai
      if (dto.task_id && dto.project_id) {
        return { error: 'Chỉ được truyền task_id hoặc project_id' };
      }

      const comment = await this.prisma.task_comments.create({
        data: {
          task_id: dto.task_id ?? null,
          project_id: dto.project_id ?? null,
          user_id: dto.user_id,
          content: dto.content,
          type: dto.type,
        },
      });

      return comment;
    } catch {
      console.error('Create comment failed');
      return { error: 'Thất bại' };
    }
  }

  async deleteComment(id: string): Promise<string> {
    try {
      if (!id) {
        return 'Dữ liệu truyền vào thiếu';
      }

      const deletedComment = await this.prisma.task_comments.delete({
        where: {
          id,
        },
      });

      return deletedComment ? 'Thành công' : 'Thất bại';
    } catch {
      console.error('Delete comment failed');
      return 'Thất bại';
    }
  }
}
