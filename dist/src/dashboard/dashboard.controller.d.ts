import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardController {
    private readonly dashboardService;
    private readonly prisma;
    constructor(dashboardService: DashboardService, prisma: PrismaService);
    getOverview(user: {
        id: string;
    }): Promise<{
        totalTasks: number;
        status: {
            new: number;
            doing: number;
            done: number;
            closed: number;
            draft: number;
            waitingApproval: number;
            rejected: number;
        };
        priority: {
            low: number;
            medium: number;
            high: number;
            urgent: number;
        };
        deadline: {
            overdue: number;
            dueSoon: number;
        };
    }>;
    getAdminOverview(user: {
        id: string;
    }): Promise<{
        users: {
            total: number;
            active: number;
            inactive: number;
            locked: number;
        };
        projects: {
            total: number;
            planning: number;
            active: number;
            completed: number;
            archived: number;
        };
        tasks: {
            total: number;
            status: {
                new: number;
                doing: number;
                done: number;
                closed: number;
                draft: number;
                waitingApproval: number;
                rejected: number;
            };
            priority: {
                low: number;
                medium: number;
                high: number;
                urgent: number;
            };
            deadline: {
                overdue: number;
                dueSoon: number;
            };
        };
        approvals: {
            pending: number;
            approved: number;
            rejected: number;
        };
    }>;
}
