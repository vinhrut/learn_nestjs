import {
    Body,
    Controller,
    Delete,
    FileTypeValidator,
    Get,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    Post,
    Query,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateComment, DeleteCommentDto } from './comment.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateAttachmentDto } from './comment.dto';
import { CommentGateway } from './comment.gateway';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_REGEX =
    /^(image\/(jpeg|png|webp|gif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/zip)$/;
@Controller('comments')
export class CommentController {
    constructor(
        private readonly commentService: CommentService,
        private readonly commentGateway: CommentGateway,
    ) { }

    // GET /comments
    @Get()
    async getAll() {
        return this.commentService.getAll();
    }
    @Get("/:taskId")
    async getComment(
        @Param('taskId') taskId: string,
        @Query('skip') skip: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.commentService.getCommentOfTask(taskId, skip, limit);
    }

    @Post("/contents")
    async createComment(
        @Body() dto: CreateComment,
    ): Promise<string> {
        const comment =
            await this.commentService.create(dto);
        this.commentGateway.emitNewComment(
            dto.task_id,
            comment,
        );

        return "Thành Công";
    }
    @Delete("/contents")
    async deleteComment(
        @Query("id") id: string,
        @Query("id_task") id_task: string,
    ): Promise<string> {
        const comment =
            await this.commentService.deleteComment(id);

        this.commentGateway.emitDeleteComment(
            id_task,
            id,
        );

        return comment;
    }
    //attach
    @Post('/attachments')
    @UseInterceptors(FileInterceptor('file'))
    async createAttach(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
                    new FileTypeValidator({ fileType: ALLOWED_MIME_REGEX }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Body() dto: CreateAttachmentDto,

    ) {
        const attachment =
            await this.commentService.createAttach(file, dto);

        // Thông báo realtime cho những người đang ở task
        this.commentGateway.emitNewAttachment(
            dto.task_id,
            attachment,
        );

        return {
            success: true,
            message: 'Tạo attachment thành công',
            data: attachment,
        };
    }
    @Delete("/attachments")
    async deleteAttach(
        @Query("id") id: string,
        @Query("id_task") id_task: string
    ) {
        const attach = await this.commentService.deleteAttach(id)
        this.commentGateway.emitDeleteAttachment(
            id_task,
            id,
        );
        return attach;
    }
}