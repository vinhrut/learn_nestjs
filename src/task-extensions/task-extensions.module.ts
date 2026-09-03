import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';
import { TaskExtensionsController } from './task-extensions.controller';
import { TaskExtensionsService } from './task-extensions.service';

@Module({
  imports: [PrismaModule, NotificationsModule, TasksModule],
  controllers: [TaskExtensionsController],
  providers: [TaskExtensionsService],
})
export class TaskExtensionsModule {}
