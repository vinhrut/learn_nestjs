import { Module } from '@nestjs/common';

import { ExportController } from './export.controller';
import { ExportService } from './export.service';

import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
    imports: [DashboardModule],
    controllers: [ExportController],
    providers: [ExportService],
})
export class ExportModule { }