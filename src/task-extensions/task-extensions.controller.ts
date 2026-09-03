import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { role_code } from '@prisma/client';

import { TaskExtensionsService } from './task-extensions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/types/jwt-payload.type';

import { CreateExtensionDto } from './dto/create-extension.dto';
import {
  ApproveExtensionDto,
  RejectExtensionDto,
} from './dto/review-extension.dto';

@Controller('task-extensions')
@UseGuards(JwtAuthGuard)
export class TaskExtensionsController {
  constructor(private readonly taskExtensionsService: TaskExtensionsService) {}

  @Post()
  create(@Body() dto: CreateExtensionDto, @CurrentUser() user: JwtUser) {
    return this.taskExtensionsService.create(dto, user);
  }

  @Get('task/:taskId')
  listByTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.taskExtensionsService.listByTask(taskId, user);
  }

  @UseGuards(RolesGuard)
  @Roles(role_code.LEAD)
  @Post('approve')
  approve(@Body() dto: ApproveExtensionDto, @CurrentUser() user: JwtUser) {
    return this.taskExtensionsService.approve(dto, user);
  }

  @UseGuards(RolesGuard)
  @Roles(role_code.LEAD)
  @Post('reject')
  reject(@Body() dto: RejectExtensionDto, @CurrentUser() user: JwtUser) {
    return this.taskExtensionsService.reject(dto, user);
  }
}
