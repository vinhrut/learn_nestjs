import { Body, Injectable, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ICommentRepository } from './comment.interface';
import { CreateComment, DeleteCommentDto } from './comment.dto';
import { task_comments } from '@prisma/client';
@Injectable()
export class CommentRepository implements ICommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<any[]> {
    return this.prisma.task_comments.findMany({
      where: {
        deleted_at: null,
      },
    });
  }
  async findByTaskId(
    taskId: string,
    skip: string,
    limit: string,
  ): Promise<any[]> {
    const dataComment = await this.prisma.task_comments.findMany({
      where: {
        task_id: taskId,
        deleted_at: null,
      },
    });
    const dataAttach = await this.prisma.attachments.findMany({
      where: {
        task_id: taskId,
        deleted_at: null,
      },
    });
    const data = [
      ...dataComment.map((item) => ({
        ...item,
        type: 'comment',
      })),

      ...dataAttach.map((item) => ({
        ...item,
        type: 'attachment',
        size_bytes: item.size_bytes ? Number(item.size_bytes) : null,
      })),
    ].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    const skipPage = (Number(skip) - 1) * Number(limit);

    const result = data.slice(skipPage, skipPage + Number(limit));
    return result;
  }
  async create(dto: CreateComment): Promise<any> {
    try {
      console.log(dto);
      if (!dto.content || !dto.task_id || !dto.user_id) {
        return 'Dữ liệu truyền vào thiếu';
      }
      const comment = await this.prisma.task_comments.create({
        data: {
          task_id: dto.task_id,
          user_id: dto.user_id,
          content: dto.content,
        },
      });

      return comment;
    } catch (error) {
      return 'Thất bại';
    }
  }
  async deleteComment(id: string): Promise<string> {
    try {
      if (!id) {
        return 'Dữ liệu truyền vào thiếu';
      }
      const boolDelete = await this.prisma.task_comments.delete({
        where: { id },
      });
      return boolDelete ? 'Thành công' : ' Thất bại';
    } catch (error) {
      return ' Thất bại';
    }
  }
}
