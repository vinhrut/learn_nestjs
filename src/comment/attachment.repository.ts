import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { attachments } from '@prisma/client';

@Injectable()
export class AttachmentRepository {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async create(data: {
        task_id: string;
        uploaded_by: string;
        file_url: string;
        file_name: string;
        mime_type?: string;
        size_bytes?: bigint;
    }): Promise<attachments> {
        return this.prisma.attachments.create({
            data: {
                file_url: data.file_url,
                file_name: data.file_name,
                mime_type: data.mime_type,
                size_bytes: data.size_bytes,
                tasks: {
                    connect: { id: data.task_id },
                },
                users: {
                    connect: { id: data.uploaded_by },
                },
            },
        });
    }
    async deleteAttach(id: string): Promise<string> {
        const boolAttach =await this.prisma.attachments.delete({
            where: { id }
        })
        return boolAttach?"Thành công" : " Thất bại"
    }
}