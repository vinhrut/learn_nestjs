import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommentModule } from './comment/comment.module';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    RolesModule,
    ProjectsModule,
    TasksModule,
    NotificationsModule,
    CommentModule,
    ConfigModule.forRoot({
      isGlobal: true,
    })
  ],
})
export class AppModule { }
