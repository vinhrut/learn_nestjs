import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommentModule } from './comment/comment.module';
import { TaskHistoryModule } from './task-history/task-history.module';
import { TaskExtensionsModule } from './task-extensions/task-extensions.module';
import { MailModule } from './mail/mail.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExportModule } from './export/export.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SetupModule } from './setup/setup.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    MailModule,
    RealtimeModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    RolesModule,
    ProjectsModule,
    TasksModule,
    NotificationsModule,
    CommentModule,
    TaskHistoryModule,
    TaskExtensionsModule,
    DashboardModule,
    ExportModule,
    SetupModule,
  ],
})
export class AppModule { }
