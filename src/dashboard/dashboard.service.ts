import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    task_priority,
    task_status,
    role_code,
    project_member_role,
} from '@prisma/client';

@Injectable()
export class DashboardService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async getOverview(userId: string) {

        // ============================================================
        // 1. LẤY USER + ROLE
        // ============================================================

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
            throw new ForbiddenException('User không tồn tại');
        }

        const roles = user.user_roles.map(
            (userRole) => userRole.roles.code,
        );

        // ============================================================
        // 2. XÁC ĐỊNH PHẠM VI TASK
        // ============================================================

        let taskWhere: any = {
            deleted_at: null,
        };

        // ============================================================
        // ADMIN
        // ============================================================

        if (roles.includes(role_code.ADMIN)) {

            // Admin xem toàn bộ task
            taskWhere = {
                deleted_at: null,
            };
        }

        // ============================================================
        // BA
        // ============================================================

        else if (roles.includes(role_code.BA)) {

            // Lấy các project mà BA đang quản lý
            const managedProjects =
                await this.prisma.project_members.findMany({
                    where: {
                        user_id: userId,
                        project_role: {
                            in: [
                                project_member_role.OWNER,
                                project_member_role.MANAGER,
                            ],
                        },
                    },
                    select: {
                        project_id: true,
                    },
                });

            const projectIds = managedProjects.map(
                (project) => project.project_id,
            );

            // BA chỉ xem task thuộc project mình quản lý
            taskWhere = {
                deleted_at: null,
                project_id: {
                    in: projectIds,
                },
            };
        }

        // ============================================================
        // USER
        // ============================================================

        else if (roles.includes(role_code.USER)) {

            // User chỉ xem task được giao cho mình
            taskWhere = {
                deleted_at: null,
                assignee_id: userId,
            };
        }

        // ============================================================
        // ROLE KHÔNG HỢP LỆ
        // ============================================================

        else {
            throw new ForbiddenException(
                'Bạn không có quyền xem Dashboard',
            );
        }

        // ============================================================
        // 3. DATE
        // ============================================================

        const now = new Date();

        const next24Hours = new Date(
            now.getTime() + 24 * 60 * 60 * 1000,
        );

        // ============================================================
        // 4. TASK STATISTICS
        // ============================================================

        const [
            totalTasks,

            // STATUS
            newTasks,
            doingTasks,
            doneTasks,
            closedTasks,
            draftTasks,
            waitingApprovalTasks,
            rejectedTasks,

            // PRIORITY
            lowTasks,
            mediumTasks,
            highTasks,
            urgentTasks,

            // DEADLINE
            overdueTasks,
            dueSoonTasks,
        ] = await Promise.all([

            // TOTAL
            this.prisma.tasks.count({
                where: taskWhere,
            }),

            // ========================================================
            // STATUS
            // ========================================================

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: task_status.NEW,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: task_status.DOING,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: task_status.DONE,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: task_status.CLOSED,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: task_status.DRAFT,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: task_status.WAITING_APPROVAL,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    status: task_status.REJECTED,
                },
            }),

            // ========================================================
            // PRIORITY
            // ========================================================

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    priority: task_priority.LOW,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    priority: task_priority.MEDIUM,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    priority: task_priority.HIGH,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    priority: task_priority.URGENT,
                },
            }),

            // ========================================================
            // OVERDUE
            // ========================================================

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    due_date: {
                        lt: now,
                    },
                    status: {
                        notIn: [
                            task_status.DONE,
                            task_status.CLOSED,
                        ],
                    },
                },
            }),

            // ========================================================
            // DUE SOON
            // ========================================================

            this.prisma.tasks.count({
                where: {
                    ...taskWhere,
                    due_date: {
                        gte: now,
                        lte: next24Hours,
                    },
                    status: {
                        notIn: [
                            task_status.DONE,
                            task_status.CLOSED,
                        ],
                    },
                },
            }),
        ]);

        // ============================================================
        // 5. RESPONSE
        // ============================================================

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
        // ============================================================
        // 1. USERS
        // ============================================================

        const [
            totalUsers,
            activeUsers,
            inactiveUsers,
            lockedUsers,

            // ========================================================
            // 2. PROJECTS
            // ========================================================

            totalProjects,
            planningProjects,
            activeProjects,
            completedProjects,
            archivedProjects,

            // ========================================================
            // 3. TASKS
            // ========================================================

            totalTasks,
            newTasks,
            doingTasks,
            doneTasks,
            closedTasks,
            draftTasks,
            waitingApprovalTasks,
            rejectedTasks,

            // ========================================================
            // 4. PRIORITY
            // ========================================================

            lowTasks,
            mediumTasks,
            highTasks,
            urgentTasks,

            // ========================================================
            // 5. APPROVAL
            // ========================================================

            pendingApprovals,
            approvedApprovals,
            rejectedApprovals,

        ] = await Promise.all([

            // ========================================================
            // USERS
            // ========================================================

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

            // ========================================================
            // PROJECTS
            // ========================================================

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

            // ========================================================
            // TASKS
            // ========================================================

            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: task_status.NEW,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: task_status.DOING,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: task_status.DONE,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: task_status.CLOSED,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: task_status.DRAFT,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: task_status.WAITING_APPROVAL,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    status: task_status.REJECTED,
                },
            }),

            // ========================================================
            // PRIORITY
            // ========================================================

            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    priority: task_priority.LOW,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    priority: task_priority.MEDIUM,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    priority: task_priority.HIGH,
                },
            }),

            this.prisma.tasks.count({
                where: {
                    deleted_at: null,
                    priority: task_priority.URGENT,
                },
            }),

            // ========================================================
            // APPROVAL
            // ========================================================

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

        // ============================================================
        // 6. DEADLINE
        // ============================================================

        const now = new Date();

        const next24Hours = new Date(
            now.getTime() + 24 * 60 * 60 * 1000,
        );

        const overdueTasks = await this.prisma.tasks.count({
            where: {
                deleted_at: null,
                due_date: {
                    lt: now,
                },
                status: {
                    notIn: [
                        task_status.DONE,
                        task_status.CLOSED,
                    ],
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
                    notIn: [
                        task_status.DONE,
                        task_status.CLOSED,
                    ],
                },
            },
        });

        // ============================================================
        // 7. RESPONSE
        // ============================================================

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
}