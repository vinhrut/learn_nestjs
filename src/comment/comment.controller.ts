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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { role_code } from '@prisma/client';
import { CommentService } from './comment.service';
import { CreateComment, DeleteCommentDto } from './comment.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateAttachmentDto } from './comment.dto';
import { CommentGateway } from './comment.gateway';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TaskAccessGuard } from '../auth/guards/task-access.guard';
import type { JwtUser } from '../auth/types/jwt-payload.type';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_REGEX =
  /^(image\/(jpeg|png|webp|gif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/zip)$/;
@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly commentGateway: CommentGateway,
  ) {}

  // GET /comments — liệt kê chéo mọi task nên giới hạn cho ADMIN.
  @UseGuards(RolesGuard)
  @Roles(role_code.ADMIN)
  @Get()
  async getAll() {
    return this.commentService.getAll();
  }

  @UseGuards(TaskAccessGuard)
  @Get('/:taskId')
  async getComment(
    @Param('taskId') taskId: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '10',
  ) {
    return this.commentService.getCommentOfTask(taskId, skip, limit);
  }

  @UseGuards(TaskAccessGuard)
  @Post('/contents')
  async createComment(
    @Body() dto: CreateComment,
    @CurrentUser() user: JwtUser,
  ): Promise<string> {
    // Tác giả lấy từ token, không tin `user_id` do client gửi lên.
    const comment = await this.commentService.create({
      ...dto,
      user_id: user.id,
    });
    this.commentGateway.emitNewComment(dto.task_id, comment);

    return 'Thành Công';
  }

  @UseGuards(TaskAccessGuard)
  @Delete('/contents')
  async deleteComment(
    @Query('id') id: string,
    @Query('id_task') id_task: string,
  ): Promise<string> {
    const comment = await this.commentService.deleteComment(id);

    this.commentGateway.emitDeleteComment(id_task, id);

    return comment;
  }
  //attach
  @UseGuards(TaskAccessGuard)
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
    file: any,
    @Body() dto: CreateAttachmentDto,
    @CurrentUser() user: JwtUser,
  ) {
    // Người upload lấy từ token, không tin `uploaded_by` do client gửi lên.
    const attachment = await this.commentService.createAttach(file, {
      ...dto,
      uploaded_by: user.id,
    });

    // Thông báo realtime cho những người đang ở task
    this.commentGateway.emitNewAttachment(dto.task_id, attachment);

    return {
      success: true,
      message: 'Tạo attachment thành công',
      data: attachment,
    };
  }
  @UseGuards(TaskAccessGuard)
  @Delete('/attachments')
  async deleteAttach(
    @Query('id') id: string,
    @Query('id_task') id_task: string,
  ) {
    const attach = await this.commentService.deleteAttach(id);
    this.commentGateway.emitDeleteAttachment(id_task, id);
    return attach;
  }
}
