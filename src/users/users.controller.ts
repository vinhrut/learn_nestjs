import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { role_code } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SelfOrAdminGuard } from '../auth/guards/self-or-admin.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UsersService } from './users.service';
import type { RequestUser } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_code.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_code.ADMIN)
  @Get()
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, SelfOrAdminGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, SelfOrAdminGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() requester: RequestUser,
  ) {
    return this.usersService.update(id, dto, requester);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_code.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() requester: RequestUser) {
    return this.usersService.remove(id, requester.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_code.ADMIN)
  @Patch(':id/lock')
  lock(@Param('id') id: string, @CurrentUser() requester: RequestUser) {
    return this.usersService.lock(id, requester.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_code.ADMIN)
  @Patch(':id/unlock')
  unlock(@Param('id') id: string) {
    return this.usersService.unlock(id);
  }
}
