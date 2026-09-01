import { task_comments } from '@prisma/client';
import { CreateComment } from './comment.dto';

export interface ICommentRepository {
  findAll(): Promise<any[]>;
  findByTaskId(taskId: string, skip: string, limit: string): Promise<any[]>;
  create(dto: CreateComment): Promise<any[]>;
  deleteComment(id: string): Promise<string>;
}
export const COMMENT_REPOSITORY = 'COMMENT_REPOSITORY';
