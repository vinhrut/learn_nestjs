import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateComment, CreateAttachmentDto } from './comment.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommentGateway } from './comment.gateway';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TaskAccessGuard } from '../auth/guards/task-access.guard';
import type { JwtUser } from '../auth/types/jwt-payload.type';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_REGEX =
  /^(image\/(jpeg|png|webp|gif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/zip)$/;
// @UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly commentGateway: CommentGateway,
  ) {}

  // GET /comments — liệt kê chéo mọi task nên giới hạn cho ADMIN.
  // @UseGuards(RolesGuard)
  // @Roles(role_code.ADMIN)
  // @Get()
  // async getAll() {
  //     return this.commentService.getAll();
  // }

  @Get()
  async getComment(
    @Query('taskId') taskId: string,
    @Query('projectId') projectId: string,
    @Query('skip') skip: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.commentService.getCommentOfTask(taskId, projectId, skip, limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('/contents')
  async createComment(
    @Body() dto: CreateComment,
    @CurrentUser() user: JwtUser,
  ): Promise<string> {
    const comment = await this.commentService.create({
      ...dto,
      user_id: user?.id,
    });

    // Check if comment creation failed
    if (!comment || (typeof comment === 'object' && 'error' in comment)) {
      return 'Thất bại';
    }

    const commentWithUser = await this.commentService.findOneComment(user?.id);

    const data = {
      ...(comment as Record<string, unknown>),
      users: commentWithUser[0],
    };
    this.commentGateway.emitNewComment(dto.task_id, dto.project_id, data);

    return 'Thành Công';
  }

  @UseGuards(TaskAccessGuard)
  @Delete('/contents')
  async deleteComment(
    @Query('id') id: string,
    @Query('id_task') id_task?: string,
    @Query('id_project') id_project?: string,
  ): Promise<string> {
    const comment = await this.commentService.deleteComment(id);

    this.commentGateway.emitDeleteComment(id_task, id_project, id);

    return comment;
  }
  //attach
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async createAttach(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_FILE_SIZE,
          }),
          new FileTypeValidator({
            fileType: ALLOWED_MIME_REGEX,
          }),
        ],
      }),
    )
    file: any,

    @Body() dto: CreateAttachmentDto,
    @CurrentUser() user: JwtUser,
  ) {
    console.log('🔥 DTO:', dto);
    console.log('🔥 DTO project_id:', dto.project_id);
    if (!dto.task_id && !dto.project_id) {
      return {
        success: false,
        message: 'Phải có task_id hoặc project_id',
      };
    }

    if (dto.task_id && dto.project_id) {
      return {
        success: false,
        message: 'Không được truyền đồng thời task_id và project_id',
      };
    }

    const attachment = await this.commentService.createAttach(file, {
      ...dto,
      uploaded_by: user?.id,
    });
    const attachmentWithUser = await this.commentService.findOneComment(
      user?.id,
    );
    const data = {
      ...attachment,
      users: attachmentWithUser[0],
    };
    this.commentGateway.emitNewAttachment(dto.task_id, dto.project_id, data);

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
    @Query('id_task') id_task?: string,
    @Query('id_project') id_project?: string,
  ) {
    const attach = await this.commentService.deleteAttach(id);
    this.commentGateway.emitDeleteAttachment(id_task, id_project, id);
    return attach;
  }
}
