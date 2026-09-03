import { task_comments } from '@prisma/client';
import { CreateComment } from './comment.dto';

export interface ICommentRepository {
    findAll(): Promise<any[]>;
    findByTaskId(taskId: string, projectId:string, skip: string, limit: string): Promise<{
        data: any[];
        totalPage: number;
    }>;
    create(dto: CreateComment & { user_id: string }): Promise<any[]>;
    deleteComment(id: string): Promise<string>
    findOneComment(id:string): Promise<any>
}
export const COMMENT_REPOSITORY = 'COMMENT_REPOSITORY';
