import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { CommentService } from './comment.service';
import { CreateComment } from './comment.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class CommentGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly commentService: CommentService) {}

  // =========================
  // JOIN TASK ROOM
  // =========================
  @SubscribeMessage('join_task')
  joinTask(@MessageBody() taskId: string, @ConnectedSocket() client: Socket) {
    const room = `task_${taskId}`;

    client.join(room);

    console.log(`${client.id} joined ${room}`);

    return {
      success: true,
      message: `Joined ${room}`,
    };
  }

  // =========================
  // CREATE COMMENT
  // =========================
  emitNewComment(taskId: string, comment: any) {
    this.server.to(`task_${taskId}`).emit('new_comment', comment);
  }

  // =========================
  // EMIT NEW ATTACHMENT
  // =========================
  emitNewAttachment(taskId: string, attachment: any) {
    this.server.to(`task_${taskId}`).emit('new_attachment', attachment);
  }

  emitDeleteComment(taskId: string, commentId: string) {
    this.server.to(`task_${taskId}`).emit('comment_deleted', {
      id: commentId,
    });
  }
  emitDeleteAttachment(taskId: string, attachmentId: string) {
    this.server.to(`task_${taskId}`).emit('attachment_deleted', {
      id: attachmentId,
    });
  }
}
