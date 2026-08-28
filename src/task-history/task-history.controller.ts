import {
    Controller,
    Get,
    Param,
    UseGuards,
} from '@nestjs/common';

import { TaskHistoryService } from './task-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('task-history')
@UseGuards(JwtAuthGuard)
export class TaskHistoryController {
    constructor(
        private readonly taskHistoryService: TaskHistoryService,
    ) { }

    @Get(':taskId')
    findByTask(@Param('taskId') taskId: string) {
        return this.taskHistoryService.findByTask(taskId);
    }
}