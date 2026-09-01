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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const STATUS_TRANSITIONS = {
    DRAFT: {
        allowedStatuses: ['WAITING_APPROVAL'],
        roles: ['BA', 'ADMIN', 'USER', 'LEAD'],
    },
    WAITING_APPROVAL: {
        allowedStatuses: ['NEW', 'REJECTED'],
        roles: ['LEAD'],
    },
    NEW: {
        allowedStatuses: ['DOING', 'WAITING_APPROVAL'],
        roles: ['BA', 'ADMIN', 'USER', 'LEAD'],
    },
    DOING: {
        allowedStatuses: ['DONE', 'NEW'],
        roles: ['BA', 'ADMIN', 'USER', 'LEAD'],
    },
    DONE: {
        allowedStatuses: ['CLOSED', 'DOING'],
        roles: ['LEAD'],
    },
    CLOSED: {
        allowedStatuses: [],
        roles: [],
    },
    REJECTED: {
        allowedStatuses: ['WAITING_APPROVAL', 'DRAFT'],
        roles: ['BA', 'ADMIN', 'USER', 'LEAD'],
    },
};
let TasksService = class TasksService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkProjectAccess(projectId, user) {
        const project = await this.prisma.projects.findFirst({
            where: {
                id: projectId,
                deleted_at: null,
                OR: [
                    { owner_id: user.id },
                    { project_members: { some: { user_id: user.id } } },
                ],
            },
        });
        return !!project;
    }
    canTransition(currentStatus, newStatus, userRole, isCreator, isAssignee) {
        const transition = STATUS_TRANSITIONS[currentStatus];
        if (!transition)
            return false;
        if (!transition.allowedStatuses.includes(newStatus)) {
            return false;
        }
        if (!transition.roles.includes(userRole)) {
            return false;
        }
        return true;
    }
    async getTaskWithRelations(taskId) {
        return this.prisma.tasks.findUnique({
            where: { id: taskId },
            include: {
                users_tasks_creator_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                users_tasks_assignee_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                users_tasks_assigner_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                projects: {
                    select: { id: true, name: true, code: true },
                },
            },
        });
    }
    async logHistory(taskId, actorId, action, oldStatus, newStatus, comment) {
        await this.prisma.task_histories.create({
            data: {
                task_id: taskId,
                actor_id: actorId,
                action,
                old_status: oldStatus,
                new_status: newStatus,
                comment,
            },
        });
    }
    async findAll(query, user) {
        const where = {
            deleted_at: null,
        };
        if (query.project_id) {
            const hasAccess = await this.checkProjectAccess(query.project_id, user);
            if (!hasAccess) {
                throw new common_1.ForbiddenException('You do not have access to this project');
            }
            where.project_id = query.project_id;
        }
        if (query.assignee_id) {
            where.assignee_id = query.assignee_id;
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.approval_status) {
            where.assignment_status = query.approval_status;
        }
        if (query.search) {
            where.title = { contains: query.search, mode: 'insensitive' };
        }
        if (!user.roles.includes('LEAD') && !user.roles.includes('ADMIN')) {
            where.project = {
                deleted_at: null,
                project_members: {
                    some: { user_id: user.id },
                },
            };
        }
        const tasks = await this.prisma.tasks.findMany({
            where,
            include: {
                users_tasks_creator_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                users_tasks_assignee_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                projects: {
                    select: { id: true, name: true, code: true },
                },
            },
            orderBy: [{ board_position: 'asc' }, { created_at: 'desc' }],
        });
        return tasks.map((task, index) => ({
            ...task,
            code: `TSK-${String(index + 1).padStart(4, '0')}`,
        }));
    }
    async findByProject(projectId, user) {
        const hasAccess = await this.checkProjectAccess(projectId, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this project');
        }
        const tasks = await this.prisma.tasks.findMany({
            where: {
                project_id: projectId,
                deleted_at: null,
            },
            include: {
                users_tasks_creator_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                users_tasks_assignee_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                projects: {
                    select: { id: true, name: true, code: true },
                },
            },
            orderBy: [{ board_position: 'asc' }, { created_at: 'desc' }],
        });
        return tasks.map((task, index) => ({
            ...task,
            code: `TSK-${projectId.substring(0, 4).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
        }));
    }
    async findOne(taskId, user) {
        const task = await this.getTaskWithRelations(taskId);
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this task');
        }
        return {
            ...task,
            code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
        };
    }
    async create(projectId, dto, user) {
        const hasAccess = await this.checkProjectAccess(projectId, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this project');
        }
        const maxPosition = await this.prisma.tasks.aggregate({
            where: { project_id: projectId, deleted_at: null },
            _max: { board_position: true },
        });
        const newPosition = (maxPosition._max.board_position || 0) + 1;
        const task = await this.prisma.tasks.create({
            data: {
                project_id: projectId,
                title: dto.title,
                description: dto.description,
                priority: dto.priority || 'MEDIUM',
                status: 'DRAFT',
                due_date: dto.due_date ? new Date(dto.due_date) : null,
                creator_id: user.id,
                assignee_id: dto.assignee_id,
                board_position: newPosition,
            },
            include: {
                users_tasks_creator_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                users_tasks_assignee_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                projects: {
                    select: { id: true, name: true, code: true },
                },
            },
        });
        await this.logHistory(task.id, user.id, 'CREATED');
        return {
            ...task,
            code: `TSK-${projectId.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
        };
    }
    async update(taskId, dto, user) {
        const task = await this.prisma.tasks.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this task');
        }
        if (task.creator_id !== user.id &&
            task.assignee_id !== user.id &&
            !user.roles.includes('LEAD')) {
            throw new common_1.ForbiddenException('You do not have permission to update this task');
        }
        if (task.status === 'CLOSED') {
            throw new common_1.BadRequestException('Cannot update closed task');
        }
        const updatedTask = await this.prisma.tasks.update({
            where: { id: taskId },
            data: {
                title: dto.title ?? task.title,
                description: dto.description ?? task.description,
                priority: dto.priority ?? task.priority,
                due_date: dto.due_date ? new Date(dto.due_date) : task.due_date,
                assignee_id: dto.assignee_id ?? task.assignee_id,
            },
            include: {
                users_tasks_creator_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                users_tasks_assignee_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                projects: {
                    select: { id: true, name: true, code: true },
                },
            },
        });
        await this.logHistory(taskId, user.id, 'UPDATED');
        return {
            ...updatedTask,
            code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
        };
    }
    async delete(taskId, user) {
        const task = await this.prisma.tasks.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        if (task.creator_id !== user.id && !user.roles.includes('LEAD')) {
            throw new common_1.ForbiddenException('You do not have permission to delete this task');
        }
        await this.prisma.tasks.update({
            where: { id: taskId },
            data: { deleted_at: new Date() },
        });
        return { message: 'Task deleted successfully' };
    }
    async updateStatus(taskId, dto, user) {
        const task = await this.prisma.tasks.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this task');
        }
        const currentStatus = task.status;
        const newStatus = dto.status;
        const userRole = user.roles[0] || 'USER';
        const isCreator = task.creator_id === user.id;
        const isAssignee = task.assignee_id === user.id;
        if (!this.canTransition(currentStatus, newStatus, userRole, isCreator, isAssignee)) {
            throw new common_1.ForbiddenException(`Cannot transition from ${currentStatus} to ${newStatus}`);
        }
        const updatedTask = await this.prisma.tasks.update({
            where: { id: taskId },
            data: {
                status: newStatus,
            },
            include: {
                users_tasks_creator_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                users_tasks_assignee_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                projects: {
                    select: { id: true, name: true, code: true },
                },
            },
        });
        await this.logHistory(taskId, user.id, 'STATUS_CHANGED', currentStatus, newStatus);
        return {
            ...updatedTask,
            code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
        };
    }
    async submit(dto, user) {
        const task = await this.prisma.tasks.findUnique({
            where: { id: dto.task_id },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this task');
        }
        if (task.creator_id !== user.id) {
            throw new common_1.ForbiddenException('Only task creator can submit');
        }
        if (task.status !== 'DRAFT') {
            throw new common_1.BadRequestException('Only DRAFT tasks can be submitted');
        }
        const updatedTask = await this.prisma.tasks.update({
            where: { id: dto.task_id },
            data: { status: 'WAITING_APPROVAL' },
            include: {
                users_tasks_creator_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                users_tasks_assignee_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                projects: {
                    select: { id: true, name: true, code: true },
                },
            },
        });
        await this.logHistory(dto.task_id, user.id, 'SUBMITTED');
        return {
            ...updatedTask,
            code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
        };
    }
    async approve(dto, user) {
        if (!user.roles.includes('LEAD')) {
            throw new common_1.ForbiddenException('Only Leader can approve tasks');
        }
        const task = await this.prisma.tasks.findUnique({
            where: { id: dto.task_id },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this task');
        }
        if (task.status !== 'WAITING_APPROVAL') {
            throw new common_1.BadRequestException('Only tasks in WAITING_APPROVAL status can be approved');
        }
        const oldStatus = task.status;
        const updatedTask = await this.prisma.tasks.update({
            where: { id: dto.task_id },
            data: {
                status: 'NEW',
                assignment_status: 'APPROVED',
            },
            include: {
                users_tasks_creator_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                users_tasks_assignee_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                projects: {
                    select: { id: true, name: true, code: true },
                },
            },
        });
        await this.logHistory(dto.task_id, user.id, 'APPROVED', oldStatus, 'NEW');
        return {
            ...updatedTask,
            code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
        };
    }
    async reject(dto, user) {
        if (!user.roles.includes('LEAD')) {
            throw new common_1.ForbiddenException('Only Leader can reject tasks');
        }
        const task = await this.prisma.tasks.findUnique({
            where: { id: dto.task_id },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this task');
        }
        if (task.status !== 'WAITING_APPROVAL') {
            throw new common_1.BadRequestException('Only tasks in WAITING_APPROVAL status can be rejected');
        }
        const oldStatus = task.status;
        const updatedTask = await this.prisma.tasks.update({
            where: { id: dto.task_id },
            data: {
                status: 'REJECTED',
                assignment_status: 'REJECTED',
            },
            include: {
                users_tasks_creator_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                users_tasks_assignee_idTousers: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
                projects: {
                    select: { id: true, name: true, code: true },
                },
            },
        });
        await this.logHistory(dto.task_id, user.id, 'REJECTED', oldStatus, 'REJECTED', dto.reason);
        return {
            ...updatedTask,
            code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
        };
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map