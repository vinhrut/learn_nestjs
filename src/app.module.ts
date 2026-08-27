import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TaskHistoryModule } from './task-history/task-history.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    RolesModule,
    ProjectsModule,
    TasksModule,
    NotificationsModule,
    TaskHistoryModule,
  ],
})
export class AppModule {}
