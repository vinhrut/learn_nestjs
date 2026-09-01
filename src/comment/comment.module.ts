import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { CommentRepository } from './comment.repository';
import { COMMENT_REPOSITORY } from './comment.interface';
import { ATTACHMENT_REPOSITORY } from './attach.interface';
import { AttachmentRepository } from './attachment.repository';
import { CloudinaryModule } from 'src/common/helpers/cloudinary.module';
import { CommentGateway } from './comment.gateway';
@Module({
  imports: [CloudinaryModule],
  controllers: [CommentController],
  providers: [
    CommentGateway,
    CommentService,
    CommentRepository,
    {
      provide: COMMENT_REPOSITORY,
      useClass: CommentRepository,
    },
    AttachmentRepository,

    {
      provide: ATTACHMENT_REPOSITORY,
      useClass: AttachmentRepository,
    },
  ],
})
export class CommentModule {}
