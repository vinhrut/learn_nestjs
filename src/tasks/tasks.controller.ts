import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';

import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/types/jwt-payload.type';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/task-status.dto';
import { SubmitTaskDto } from './dto/task-id.dto';
import { ApproveTaskDto } from './dto/task-id.dto';
import { RejectTaskDto } from './dto/task-id.dto';
import { QueryTaskDto } from './dto/query-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ==========================================
  // GET ALL TASKS
  // ==========================================
  @Get()
  findAll(@Query() query: QueryTaskDto, @CurrentUser() user: JwtUser) {
    return this.tasksService.findAll(query, user);
  }

  // ==========================================
  // GET TASKS BY PROJECT
  // ==========================================
  @Get('project/:projectId')
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.tasksService.findByProject(projectId, user);
  }

  // ==========================================
  // GET ONE TASK
  // ==========================================
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.tasksService.findOne(taskId, user);
  }

  // ==========================================
  // CREATE TASK (in project)
  // ==========================================
  @Post('project/:projectId')
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.tasksService.create(projectId, dto, user);
  }

  // ==========================================
  // UPDATE TASK
  // ==========================================
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.tasksService.update(taskId, dto, user);
  }

  // ==========================================
  // DELETE TASK
  // ==========================================
  @Delete(':id')
  delete(
    @Param('id', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.tasksService.delete(taskId, user);
  }

  // ==========================================
  // UPDATE STATUS (Drag & Drop)
  // ==========================================
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.tasksService.updateStatus(taskId, dto, user);
  }

  // ==========================================
  // SUBMIT TASK
  // ==========================================
  @Post('submit')
  submit(@Body() dto: SubmitTaskDto, @CurrentUser() user: JwtUser) {
    return this.tasksService.submit(dto, user);
  }

  // ==========================================
  // APPROVE TASK
  // ==========================================
  @Post('approve')
  approve(@Body() dto: ApproveTaskDto, @CurrentUser() user: JwtUser) {
    return this.tasksService.approve(dto, user);
  }

  // ==========================================
  // REJECT TASK
  // ==========================================
  @Post('reject')
  reject(@Body() dto: RejectTaskDto, @CurrentUser() user: JwtUser) {
    return this.tasksService.reject(dto, user);
  }
}
