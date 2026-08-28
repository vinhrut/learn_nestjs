import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ProjectService } from './projects.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { JwtUser } from '../auth/types/jwt-payload.type';

import { CreateProjectDto } from './dto/create.dto';
import { UpdateProjectDto } from './dto/update.dto';
import { AddProjectMemberDto } from './dto/add-project-memeber.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
  ) {}

  // ==========================================
  // GET MY PROJECTS
  // ==========================================

  @Get()
  findMyProjects(
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectService.findMyProjects(user);
  }

  // ==========================================
  // GET PROJECT DETAIL
  // ==========================================

  @Get(':id')
  findOne(
    @Param('id') projectId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectService.findOne(
      projectId,
      user,
    );
  }

  // ==========================================
  // GET PROJECT MEMBERS
  // ==========================================

  @Get(':id/members')
  getMembers(
    @Param('id') projectId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectService.getMembers(projectId, user);
  }

  // ==========================================
  // GET AVAILABLE USERS (for adding members)
  // ==========================================

  @Get(':id/available-users')
  getAvailableUsers(
    @Param('id') projectId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectService.getAvailableUsers(projectId, user);
  }

  // ==========================================
  // CREATE PROJECT
  // ==========================================

  @Post()
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectService.create(dto, user);
  }

  // ==========================================
  // UPDATE PROJECT
  // ==========================================

  @Patch(':id')
  update(
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectService.update(projectId, dto, user);
  }

  // ==========================================
  // ADD MEMBER
  // ==========================================

  @Post(':id/members')
  addMember(
    @Param('id') projectId: string,
    @Body() dto: AddProjectMemberDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectService.addMember(projectId, dto, user);
  }

  // ==========================================
  // REMOVE MEMBER
  // ==========================================

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') projectId: string,
    @Param('userId') memberId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectService.removeMember(projectId, memberId, user);
  }
}
