import { Controller, Get, UseGuards } from '@nestjs/common';
import { role_code } from '@prisma/client';

import { DashboardService } from './dashboard.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get('overview')
  async getOverview(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getOverview(user.id);
  }

  // Role đã có sẵn trong access token nên dùng RolesGuard thay vì query lại DB.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_code.ADMIN)
  @Get('admin/overview')
  async getAdminOverview() {
    return this.dashboardService.getAdminOverview();
  }
}
