import { CreateComment } from './comment.dto';

export interface ICommentRepository {
  findAll(): Promise<unknown[]>;
  findByTaskId(
    taskId: string,
    projectId: string,
    skip: string,
    limit: string,
  ): Promise<{
    data: unknown[];
    totalPage: number;
  }>;
  create(dto: CreateComment & { user_id: string }): Promise<unknown>;
  deleteComment(id: string): Promise<string>;
  findOneComment(id: string): Promise<Record<string, unknown>[]>;
}
export const COMMENT_REPOSITORY = 'COMMENT_REPOSITORY';
