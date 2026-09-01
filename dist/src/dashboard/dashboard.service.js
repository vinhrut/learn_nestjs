"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOverview(userId) {
        const user = await this.prisma.users.findUnique({
            where: {
                id: userId,
            },
            include: {
                user_roles: {
                    include: {
                        roles: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.ForbiddenException('User không tồn tại');
        }
        const roles = user.user_roles.map((userRole) => userRole.roles.code);
        let taskWhere = {
            deleted_at: null,
        };
        if (roles.includes(client_1.role_code.ADMIN)) {
            taskWhere = {
                deleted_at: null,
            };
        }
        else if (roles.includes(client_1.role_code.BA)) {
            const managedProjects = await this.prisma.project_members.findMany({
                where: {
                    user_id: userId,
                    project_role: {
                        in: [client_1.project_member_role.OWNER, client_1.project_member_role.MANAGER],
                    },
                },
                select: {
                    project_id: true,
                },
            });
            const projectIds = managedProjects.map((project) => project.project_id);
            taskWhere = {
                deleted_at: null,
                project_id: {
                    in: projectIds,
                },
            };
        }
        else if (roles.includes(client_1.role_code.USER)) {
            taskWhere = {
                deleted_at: null,
                assignee_id: userId,
            };
        }
        else {
            throw new common_1.ForbiddenException('Bạn không có quyền xem Dashboard');
        }
        const now = new Date();
        const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const [totalTasks, newTasks, doingTasks, doneTasks, closedTasks, draftTasks, waitingApprovalTasks, rejectedTasks, lowTasks, mediumTasks, highTasks, urgentTasks, overdueTasks, dueSoonTasks,] = await Promise.all([
            this.prisma.tasks.count({
                where: taskWhere,
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: client_1.task_status.NEW,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: client_1.task_status.DOING,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: client_1.task_status.DONE,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: client_1.task_status.CLOSED,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: client_1.task_status.DRAFT,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: client_1.task_status.WAITING_APPROVAL,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: client_1.task_status.REJECTED,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    priority: client_1.task_priority.LOW,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    priority: client_1.task_priority.MEDIUM,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    priority: client_1.task_priority.HIGH,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    priority: client_1.task_priority.URGENT,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    due_date: {
                        lt: now,
                    },
                    status: {
                        notIn: [client_1.task_status.DONE, client_1.task_status.CLOSED],
                    },
                },
            }),
            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    due_date: {
                        gte: now,
                        lte: next24Hours,
                    },
                    status: {
                        notIn: [client_1.task_status.DONE, client_1.task_status.CLOSED],
                    },
                },
            }),
        ]);
        return {
            totalTasks,
            status: {
                new: newTasks,
                doing: doingTasks,
                done: doneTasks,
                closed: closedTasks,
                draft: draftTasks,
                waitingApproval: waitingApprovalTasks,
                rejected: rejectedTasks,
            },
            priority: {
                low: lowTasks,
                medium: mediumTasks,
                high: highTasks,
                urgent: urgentTasks,
            },
            deadline: {
                overdue: overdueTasks,
                dueSoon: dueSoonTasks,
            },
        };
    }
    async getAdminOverview() {
        const [totalUsers, activeUsers, inactiveUsers, lockedUsers, totalProjects, planningProjects, activeProjects, completedProjects, archivedProjects, totalTasks, newTasks, doingTasks, doneTasks, closedTasks, draftTasks, waitingApprovalTasks, rejectedTasks, lowTasks, mediumTasks, highTasks, urgentTasks, pendingApprovals, approvedApprovals, rejectedApprovals,] = await Promise.all([
            this.prisma.users.count({
                where: {
                    deleted_at: null,
                },
            }),
            this.prisma.users.count({
                where: {
                    deleted_at: null,
                    status: 'ACTIVE',
                },
            }),
            this.prisma.users.count({
                where: {
                    deleted_at: null,
                    status: 'INACTIVE',
                },
            }),
            this.prisma.users.count({
                where: {
                    deleted_at: null,
                    status: 'LOCKED',
                },
            }),
            this.prisma.projects.count({
                where: {
                    deleted_at: null,
                },
            }),
            this.prisma.projects.count({
                where: {
                    deleted_at: null,
                    status: 'PLANNING',
                },
            }),
            this.prisma.projects.count({
                where: {
                    deleted_at: null,
                    status: 'ACTIVE',
                },
            }),
            this.prisma.projects.count({
                where: {
                    deleted_at: null,
                    status: 'COMPLETED',
                },
            }),
            this.prisma.projects.count({
                where: {
                    deleted_at: null,
                    status: 'ARCHIVED',
                },
            }),
            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: client_1.task_status.NEW,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: client_1.task_status.DOING,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: client_1.task_status.DONE,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: client_1.task_status.CLOSED,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: client_1.task_status.DRAFT,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: client_1.task_status.WAITING_APPROVAL,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: client_1.task_status.REJECTED,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    priority: client_1.task_priority.LOW,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    priority: client_1.task_priority.MEDIUM,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    priority: client_1.task_priority.HIGH,
                },
            }),
            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    priority: client_1.task_priority.URGENT,
                },
            }),
            this.prisma.task_assignment_requests.count({
                where: {
                    status: 'PENDING',
                },
            }),
            this.prisma.task_assignment_requests.count({
                where: {
                    status: 'APPROVED',
                },
            }),
            this.prisma.task_assignment_requests.count({
                where: {
                    status: 'REJECTED',
                },
            }),
        ]);
        const now = new Date();
        const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const overdueTasks = await this.prisma.tasks.count({
            where: {
                deleted_at: null,
                due_date: {
                    lt: now,
                },
                status: {
                    notIn: [client_1.task_status.DONE, client_1.task_status.CLOSED],
                },
            },
        });
        const dueSoonTasks = await this.prisma.tasks.count({
            where: {
                deleted_at: null,
                due_date: {
                    gte: now,
                    lte: next24Hours,
                },
                status: {
                    notIn: [client_1.task_status.DONE, client_1.task_status.CLOSED],
                },
            },
        });
        return {
            users: {
                total: totalUsers,
                active: activeUsers,
                inactive: inactiveUsers,
                locked: lockedUsers,
            },
            projects: {
                total: totalProjects,
                planning: planningProjects,
                active: activeProjects,
                completed: completedProjects,
                archived: archivedProjects,
            },
            tasks: {
                total: totalTasks,
                status: {
                    new: newTasks,
                    doing: doingTasks,
                    done: doneTasks,
                    closed: closedTasks,
                    draft: draftTasks,
                    waitingApproval: waitingApprovalTasks,
                    rejected: rejectedTasks,
                },
                priority: {
                    low: lowTasks,
                    medium: mediumTasks,
                    high: highTasks,
                    urgent: urgentTasks,
                },
                deadline: {
                    overdue: overdueTasks,
                    dueSoon: dueSoonTasks,
                },
            },
            approvals: {
                pending: pendingApprovals,
                approved: approvedApprovals,
                rejected: rejectedApprovals,
            },
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map