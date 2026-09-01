import { Controller, Get, ForbiddenException, UseGuards } from '@nestjs/common';

import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('overview')
  async getOverview(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getOverview(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/overview')
  async getAdminOverview(@CurrentUser() user: { id: string }) {
    const dbUser = await this.prisma.users.findUnique({
      where: {
        id: user.id,
      },
      include: {
        user_roles: {
          include: {
            roles: true,
          },
        },
      },
    });

    if (!dbUser) {
      throw new ForbiddenException('User không tồn tại');
    }

    const isAdmin = dbUser.user_roles.some(
      (userRole) => userRole.roles.code === 'ADMIN',
    );

    if (!isAdmin) {
      throw new ForbiddenException(
        'Chỉ Admin mới được truy cập Dashboard Admin',
      );
    }

    return this.dashboardService.getAdminOverview();
  }
}
