import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { TaskHistoryService } from './task-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskAccessGuard } from '../auth/guards/task-access.guard';

@Controller('task-history')
@UseGuards(JwtAuthGuard)
export class TaskHistoryController {
  constructor(private readonly taskHistoryService: TaskHistoryService) {}

  // Chỉ thành viên project chứa task mới đọc được lịch sử của task đó.
  @UseGuards(TaskAccessGuard)
  @Get(':taskId')
  findByTask(@Param('taskId') taskId: string) {
    return this.taskHistoryService.findByTask(taskId);
  }
}
