import { Module } from '@nestjs/common';
import { TaskHistoryService } from './task-history.service';
import { TaskHistoryController } from './task-history.controller';
import { PrismaModule } from '../prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  providers: [TaskHistoryService],
  controllers: [TaskHistoryController],
  exports: [TaskHistoryService],
})
export class TaskHistoryModule {}
