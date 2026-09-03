import { Inject, Injectable, Query } from '@nestjs/common';
import { COMMENT_REPOSITORY } from './comment.interface';
import type { ICommentRepository } from './comment.interface';
import { ATTACHMENT_REPOSITORY } from './attach.interface';
import type { IAttachmentRepository } from './attach.interface';
import { CreateComment, CreateAttachmentDto, DeleteCommentDto } from './comment.dto';
import { CloudinaryService } from '../common/helpers/cloudinary.helper';
@Injectable()
export class CommentService {
    constructor(
        @Inject(COMMENT_REPOSITORY)
        private readonly commentRepository: ICommentRepository,
        @Inject(ATTACHMENT_REPOSITORY)
        private readonly attachmentRepository: IAttachmentRepository,
        private readonly cloudinaryService: CloudinaryService,
    ) { }

    async getAll() {
        return this.commentRepository.findAll();
    }
    async getCommentOfTask(taskId: string, skip: string, limit: string) {
        return this.commentRepository.findByTaskId(taskId, skip, limit);
    }
    async create(dto: CreateComment) {
        return this.commentRepository.create(dto)
    }
    async deleteComment(id: string) {
        return this.commentRepository.deleteComment(id)
    }
    // attach
    async createAttach(
        file: Express.Multer.File,
        dto: CreateAttachmentDto,
    ) {
        const result = await this.cloudinaryService.uploadFile(file);
        const attachment = await this.attachmentRepository.create({
            task_id: dto.task_id,
            uploaded_by: dto.uploaded_by,
            file_url: result.url,
            file_name: file.originalname,
            mime_type: file.mimetype,
            size_bytes: BigInt(file.size),
        });

        // convert BigInt -> string trước khi trả JSON
        return {
            ...attachment,
            size_bytes: attachment.size_bytes?.toString(),
        };
    }
    async deleteAttach(
        id: string,
    ) {
        return await this.attachmentRepository.deleteAttach(id)
    }
}