import { Controller, Get, Param } from '@nestjs/common';
import { TaskHistoryService } from './task-history.service';

@Controller('task-history')
export class TaskHistoryController {
    constructor(
        private readonly taskHistoryService: TaskHistoryService,
    ) { }

    @Get(':taskId')
    findByTask(@Param('taskId') taskId: string) {
        return this.taskHistoryService.findByTask(taskId);
    }
}