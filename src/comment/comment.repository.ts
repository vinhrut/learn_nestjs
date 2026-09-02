import { Body, Injectable, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ICommentRepository } from './comment.interface';
import { CreateComment, DeleteCommentDto } from './comment.dto';
@Injectable()
export class CommentRepository implements ICommentRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(): Promise<any[]> {
        return this.prisma.task_comments.findMany({
            where: {
                deleted_at: null,
            },
        });
    }
    async findByTaskId(taskId: string, skip: string, limit: string): Promise<{
        data: any[];
        totalPage: number;
    }> {

        const dataComment = await this.prisma.task_comments.findMany({
            where: {
                task_id: taskId,
                deleted_at: null,
            },
            include: {
                users: {
                    select: {
                        id: true,
                        full_name: true,
                        avatar_url: true,
                    }
                }
            }
        })
        const dataAttach = await this.prisma.attachments.findMany({
            where: {
                task_id: taskId,
                deleted_at: null,
            },
            include: {
                users: {
                    select: {
                        id: true,
                        full_name: true,
                        avatar_url: true,
                    }
                }
            }
        })
        const data = [
            ...dataComment.map(item => ({
                ...item,
            })),

            ...dataAttach.map(item => ({
                ...item,
                size_bytes: item.size_bytes
                    ? Number(item.size_bytes)
                    : null,
            })),
        ].sort(
            (a, b) =>
                b.created_at.getTime() - a.created_at.getTime(),
        );
        const totalPage = Math.ceil(data.length / Number(limit))
        const skipPage = (Number(skip) - 1) * Number(limit);
        const result = data.slice(
            skipPage,
            skipPage + Number(limit),
        );
        return {
            data: result,
            totalPage: totalPage
        }
    }
    async create(dto: CreateComment): Promise<any> {
        try {
            console.log(dto)
            if (!dto.content || !dto.task_id || !dto.user_id || !dto.type) {
                return "Dữ liệu truyền vào thiếu"
            }
            const comment = await this.prisma.task_comments.create({
                data: {
                    task_id: dto.task_id,
                    user_id: dto.user_id,
                    content: dto.content,
                    type: dto.type
                },
            });

            return comment;
        } catch (error) {
            return "Thất bại";
        }
    }
    async deleteComment(id: string): Promise<string> {
        try {
            if (!id) {
                return "Dữ liệu truyền vào thiếu"
            }
            const boolDelete = await this.prisma.task_comments.delete({ where: { id } })
            return boolDelete ? "Thành công" : " Thất bại"

        } catch (error) {
            return " Thất bại"
        }
    }

}