import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { role_code } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskVinhService } from './task-vinh.service';

interface RequestUser {
  id: string;
  roles: string[];
}

@UseGuards(JwtAuthGuard)
@Controller('task-vinh')
export class TaskVinhController {
  constructor(private readonly taskVinhService: TaskVinhService) {}

  @UseGuards(RolesGuard)
  @Roles(role_code.ADMIN)
  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: RequestUser) {
    return this.taskVinhService.createAndAssign(dto, user.id);
  }

  @Get('assigned-to-me')
  assignedToMe(@CurrentUser() user: RequestUser) {
    return this.taskVinhService.listAssignedToMe(user.id);
  }

  @Get('projects')
  projects() {
    return this.taskVinhService.listProjects();
  }

  @UseGuards(RolesGuard)
  @Roles(role_code.ADMIN)
  @Get()
  findAll() {
    return this.taskVinhService.listAll();
  }
}
