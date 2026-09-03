import { Injectable } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';
import ExcelJS from 'exceljs';

@Injectable()
export class ExportService {
    constructor(
        private readonly dashboardService: DashboardService,
    ) { }

    async exportDashboardExcel(userId: string): Promise<Buffer> {
        const dashboard =
            await this.dashboardService.getOverview(userId);

        const workbook = new ExcelJS.Workbook();

        const worksheet = workbook.addWorksheet('Dashboard');

        worksheet.columns = [
            {
                header: 'Chỉ số',
                key: 'metric',
                width: 30,
            },
            {
                header: 'Số lượng',
                key: 'value',
                width: 15,
            },
        ];

        worksheet.addRow({
            metric: 'Tổng số task',
            value: dashboard.totalTasks,
        });

        worksheet.addRow({
            metric: 'Todo',
            value: dashboard.status.new,
        });

        worksheet.addRow({
            metric: 'Doing',
            value: dashboard.status.doing,
        });

        worksheet.addRow({
            metric: 'Done',
            value: dashboard.status.done,
        });

        worksheet.addRow({
            metric: 'Closed',
            value: dashboard.status.closed,
        });

        worksheet.addRow({
            metric: 'Draft',
            value: dashboard.status.draft,
        });

        worksheet.addRow({
            metric: 'Waiting Approval',
            value: dashboard.status.waitingApproval,
        });

        worksheet.addRow({
            metric: 'Rejected',
            value: dashboard.status.rejected,
        });

        worksheet.addRow({
            metric: 'Priority - Low',
            value: dashboard.priority.low,
        });

        worksheet.addRow({
            metric: 'Priority - Medium',
            value: dashboard.priority.medium,
        });

        worksheet.addRow({
            metric: 'Priority - High',
            value: dashboard.priority.high,
        });

        worksheet.addRow({
            metric: 'Priority - Urgent',
            value: dashboard.priority.urgent,
        });

        worksheet.addRow({
            metric: 'Overdue',
            value: dashboard.deadline.overdue,
        });

        worksheet.addRow({
            metric: 'Due Soon',
            value: dashboard.deadline.dueSoon,
        });

        worksheet.getRow(1).font = {
            bold: true,
        };

        return Buffer.from(
            await workbook.xlsx.writeBuffer(),
        );
    }
}