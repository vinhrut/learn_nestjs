import {
    Controller,
    Get,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';

import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('export')
export class ExportController {
    constructor(
        private readonly exportService: ExportService,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Get('dashboard/excel')
    async exportDashboardExcel(
        @CurrentUser() user: { id: string },
        @Res() res: Response,
    ) {
        const buffer =
            await this.exportService.exportDashboardExcel(
                user.id,
            );

        res.set({
            'Content-Type':
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

            'Content-Disposition':
                'attachment; filename="dashboard.xlsx"',
        });

        res.send(buffer);
    }
}