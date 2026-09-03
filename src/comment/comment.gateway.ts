import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class CommentGateway {

    @WebSocketServer()
    server: Server;

    // =========================================================
    // SOCKET CONNECT
    // =========================================================

    handleConnection(client: Socket) {
        console.log('=================================');
        console.log('🔌 Socket connected:', client.id);
        console.log('=================================');
    }

    // =========================================================
    // SOCKET DISCONNECT
    // =========================================================

    handleDisconnect(client: Socket) {
        console.log('=================================');
        console.log('❌ Socket disconnected:', client.id);
        console.log('=================================');
    }

    // =========================================================
    // JOIN TASK
    // =========================================================

    @SubscribeMessage('join_task')
    joinTask(
        @MessageBody() taskId: string,
        @ConnectedSocket() client: Socket,
    ) {
        if (!taskId) {
            console.log('❌ taskId không tồn tại');
            return;
        }

        const room = `task_${taskId}`;

        client.join(room);

        console.log('=================================');
        console.log('👤 Client:', client.id);
        console.log('📌 Joined task room:', room);
        console.log('=================================');

        return {
            success: true,
            room,
        };
    }

    // =========================================================
    // JOIN PROJECT
    // =========================================================

    @SubscribeMessage('join_project')
    joinProject(
        @MessageBody() projectId: string,
        @ConnectedSocket() client: Socket,
    ) {
        if (!projectId) {
            console.log('❌ projectId không tồn tại');
            return;
        }

        const room = `project_${projectId}`;

        client.join(room);

        console.log('=================================');
        console.log('👤 Client:', client.id);
        console.log('📌 Joined project room:', room);
        console.log('=================================');

        return {
            success: true,
            room,
        };
    }

    // =========================================================
    // NEW COMMENT
    // =========================================================

    emitNewComment(
        taskId: string | undefined,
        projectId: string | undefined,
        comment: any,
    ) {
       
        if (taskId) {
            const room = `task_${taskId}`;
            this.server
                .to(room)
                .emit('new_comment', comment);
        }

        // Comment thuộc Project
        if (projectId) {
            const room = `project_${projectId}`;

            console.log('📢 Emit new_comment tới:', room);

            this.server
                .to(room)
                .emit('new_comment', comment);
        }
    }

    // =========================================================
    // NEW ATTACHMENT
    // =========================================================

    emitNewAttachment(
        taskId: string | undefined,
        projectId: string | undefined,
        attachment: any,
    ) {
        
        if (taskId) {
            const room = `task_${taskId}`;
            this.server
                .to(room)
                .emit('new_attachment', attachment);
        }

        // Attachment thuộc Project
        if (projectId) {
            const room = `project_${projectId}`;
            this.server
                .to(room)
                .emit('new_attachment', attachment);
        }
    }

    // =========================================================
    // DELETE COMMENT
    // =========================================================

    emitDeleteComment(
        taskId: string | undefined,
        projectId: string | undefined,
        commentId: string,
    ) {
        console.log('=================================');
        console.log('🔥 emitDeleteComment');
        console.log('taskId:', taskId);
        console.log('projectId:', projectId);
        console.log('commentId:', commentId);
        console.log('=================================');

        const data = {
            id: commentId,
        };

        // Xóa comment trong Task
        if (taskId) {
            const room = `task_${taskId}`;

            console.log('📢 Emit comment_deleted tới:', room);

            this.server
                .to(room)
                .emit('comment_deleted', data);
        }

        // Xóa comment trong Project
        if (projectId) {
            const room = `project_${projectId}`;

            console.log('📢 Emit comment_deleted tới:', room);

            this.server
                .to(room)
                .emit('comment_deleted', data);
        }
    }

    // =========================================================
    // DELETE ATTACHMENT
    // =========================================================

    emitDeleteAttachment(
        taskId: string | undefined,
        projectId: string | undefined,
        attachmentId: string,
    ) {
        console.log('=================================');
        console.log('🔥 emitDeleteAttachment');
        console.log('taskId:', taskId);
        console.log('projectId:', projectId);
        console.log('attachmentId:', attachmentId);
        console.log('=================================');

        const data = {
            id: attachmentId,
        };

        // Xóa attachment trong Task
        if (taskId) {
            const room = `task_${taskId}`;

            console.log('📢 Emit attachment_deleted tới:', room);

            this.server
                .to(room)
                .emit('attachment_deleted', data);
        }

        // Xóa attachment trong Project
        if (projectId) {
            const room = `project_${projectId}`;

            console.log('📢 Emit attachment_deleted tới:', room);

            this.server
                .to(room)
                .emit('attachment_deleted', data);
        }
    }
}