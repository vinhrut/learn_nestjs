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
var TasksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const mail_service_1 = require("../mail/mail.service");
const notifications_service_1 = require("../notifications/notifications.service");
const taskCard = client_1.Prisma.validator()({
    include: {
        projects: { select: { id: true, name: true, code: true } },
        users_tasks_assignee_idTousers: {
            select: { id: true, full_name: true, email: true },
        },
        users_tasks_assigner_idTousers: {
            select: { id: true, full_name: true, email: true },
        },
    },
});
const STATUS_TRANSITIONS = {
    DRAFT: [
        {
            to: 'WAITING_APPROVAL',
            roles: ['BA', 'USER', 'LEAD'],
            ownership: 'creator',
        },
    ],
    WAITING_APPROVAL: [
        { to: 'NEW', roles: ['LEAD'], ownership: 'any' },
        { to: 'REJECTED', roles: ['LEAD'], ownership: 'any' },
    ],
    NEW: [
        {
            to: 'DOING',
            roles: ['BA', 'USER', 'LEAD'],
            ownership: 'creator_or_assignee',
        },
        {
            to: 'WAITING_APPROVAL',
            roles: ['BA', 'USER', 'LEAD'],
            ownership: 'creator',
        },
    ],
    DOING: [
        {
            to: 'DONE',
            roles: ['BA', 'USER', 'LEAD'],
            ownership: 'creator_or_assignee',
        },
        {
            to: 'NEW',
            roles: ['BA', 'USER', 'LEAD'],
            ownership: 'creator_or_assignee',
        },
    ],
    DONE: [
        { to: 'CLOSED', roles: ['LEAD'], ownership: 'any' },
        { to: 'DOING', roles: ['LEAD'], ownership: 'any' },
    ],
    CLOSED: [],
    REJECTED: [
        {
            to: 'WAITING_APPROVAL',
            roles: ['BA', 'USER', 'LEAD'],
            ownership: 'creator',
        },
        { to: 'DRAFT', roles: ['BA', 'USER', 'LEAD'], ownership: 'creator' },
    ],
};
const STATUS_LABEL = {
    DRAFT: 'Nháp',
    WAITING_APPROVAL: 'Chờ duyệt',
    NEW: 'Mới',
    DOING: 'Đang làm',
    DONE: 'Hoàn thành',
    CLOSED: 'Đã đóng',
    REJECTED: 'Bị từ chối',
};
let TasksService = TasksService_1 = class TasksService {
    prisma;
    mail;
    notifications;
    logger = new common_1.Logger(TasksService_1.name);
    constructor(prisma, mail, notifications) {
        this.prisma = prisma;
        this.mail = mail;
        this.notifications = notifications;
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
    canTransition(currentStatus, newStatus, userRoles, isCreator, isAssignee) {
        const rule = STATUS_TRANSITIONS[currentStatus]?.find((item) => item.to === newStatus);
        if (!rule)
            return false;
        if (!rule.roles.some((role) => userRoles.includes(role))) {
            return false;
        }
        if (userRoles.includes('LEAD'))
            return true;
        if (rule.ownership === 'creator')
            return isCreator;
        if (rule.ownership === 'creator_or_assignee')
            return isCreator || isAssignee;
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
    assignedNotificationData(taskId, assigneeId, title) {
        return {
            user_id: assigneeId,
            task_id: taskId,
            type: 'TASK_ASSIGNED',
            title: 'Bạn được giao một công việc mới',
            message: title,
        };
    }
    async sendAssignedMail(task, assigneeId, actorId) {
        try {
            const [assignee, actor] = await Promise.all([
                this.prisma.users.findFirst({
                    where: { id: assigneeId, deleted_at: null },
                    select: { email: true, full_name: true },
                }),
                this.prisma.users.findUnique({
                    where: { id: actorId },
                    select: { full_name: true, email: true },
                }),
            ]);
            if (!assignee)
                return;
            void this.mail.sendTaskAssignedEmail(assignee.email, {
                taskTitle: task.title,
                assignerName: actor?.full_name ?? actor?.email ?? 'Quản trị viên',
                priority: task.priority,
                dueDate: task.due_date?.toISOString(),
                full_name: assignee.full_name ?? undefined,
            });
        }
        catch (error) {
            this.logger.error(`Không gửi được mail giao việc (task=${task.id}): ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async notifyAssignee(task, assigneeId, actorId) {
        if (assigneeId === actorId)
            return;
        try {
            const notification = await this.prisma.notifications.create({
                data: this.assignedNotificationData(task.id, assigneeId, task.title),
            });
            this.notifications.emit(notification, {
                priority: task.priority,
                dueDate: task.due_date,
            });
        }
        catch (error) {
            this.logger.error(`Không tạo được thông báo giao việc (task=${task.id}): ${error instanceof Error ? error.message : String(error)}`);
        }
        await this.sendAssignedMail(task, assigneeId, actorId);
    }
    toCard(task) {
        return {
            id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            assignmentStatus: task.assignment_status,
            dueDate: task.due_date,
            createdAt: task.created_at,
            project: task.projects,
            assignee: task.users_tasks_assignee_idTousers,
            assigner: task.users_tasks_assigner_idTousers,
        };
    }
    async assign(dto, user) {
        const project = await this.prisma.projects.findFirst({
            where: { id: dto.projectId, deleted_at: null },
            select: { id: true },
        });
        if (!project) {
            throw new common_1.NotFoundException('Không tìm thấy dự án');
        }
        const hasAccess = await this.checkProjectAccess(dto.projectId, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập dự án này');
        }
        const assignee = await this.prisma.users.findFirst({
            where: { id: dto.assigneeId, deleted_at: null },
            select: { id: true, status: true },
        });
        if (!assignee) {
            throw new common_1.NotFoundException('Không tìm thấy người được giao việc');
        }
        if (assignee.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('Người được giao việc không ở trạng thái hoạt động');
        }
        const priority = dto.priority ?? client_1.task_priority.MEDIUM;
        const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
        const { task, notification } = await this.prisma.$transaction(async (tx) => {
            const task = await tx.tasks.create({
                data: {
                    project_id: dto.projectId,
                    title: dto.title,
                    description: dto.description,
                    priority,
                    due_date: dueDate,
                    status: 'NEW',
                    assignment_status: 'ASSIGNED',
                    creator_id: user.id,
                    assigner_id: user.id,
                    assignee_id: dto.assigneeId,
                },
                ...taskCard,
            });
            await tx.task_histories.create({
                data: {
                    task_id: task.id,
                    actor_id: user.id,
                    action: 'ASSIGNED',
                    new_status: 'NEW',
                    new_assignee_id: dto.assigneeId,
                    new_assigner_id: user.id,
                },
            });
            const notification = dto.assigneeId === user.id
                ? null
                : await tx.notifications.create({
                    data: this.assignedNotificationData(task.id, dto.assigneeId, task.title),
                });
            return { task, notification };
        });
        if (notification) {
            this.notifications.emit(notification, {
                priority: task.priority,
                dueDate: task.due_date,
            });
            void this.sendAssignedMail(task, dto.assigneeId, user.id);
        }
        return this.toCard(task);
    }
    async listAssignedToMe(userId) {
        const tasks = await this.prisma.tasks.findMany({
            where: { assignee_id: userId, deleted_at: null },
            orderBy: { created_at: 'desc' },
            ...taskCard,
        });
        return tasks.map((task) => this.toCard(task));
    }
    async findAll(query, user) {
        const where = {
            deleted_at: null,
        };
        if (query.project_id) {
            const hasAccess = await this.checkProjectAccess(query.project_id, user);
            if (!hasAccess) {
                throw new common_1.ForbiddenException('Bạn không có quyền truy cập dự án này');
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
        where.projects = {
            deleted_at: null,
            project_members: {
                some: { user_id: user.id },
            },
        };
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
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập dự án này');
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
            throw new common_1.NotFoundException('Không tìm thấy công việc');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập công việc này');
        }
        return {
            ...task,
            code: `TSK-${task.project_id.substring(0, 4).toUpperCase()}-${task.id.substring(0, 4).toUpperCase()}`,
        };
    }
    async create(projectId, dto, user) {
        const hasAccess = await this.checkProjectAccess(projectId, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập dự án này');
        }
        if (dto.assignee_id && !user.roles.includes('LEAD')) {
            throw new common_1.ForbiddenException('Chỉ Leader mới được giao việc');
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
                assigner_id: dto.assignee_id ? user.id : null,
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
        if (dto.assignee_id) {
            await this.notifyAssignee(task, dto.assignee_id, user.id);
        }
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
            throw new common_1.NotFoundException('Không tìm thấy công việc');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập công việc này');
        }
        const isLead = user.roles.includes('LEAD');
        const creatorCanEdit = task.creator_id === user.id &&
            (task.status === 'DRAFT' || task.status === 'REJECTED');
        if (!isLead && !creatorCanEdit) {
            throw new common_1.ForbiddenException('Bạn không có quyền sửa công việc này');
        }
        if (task.status === 'CLOSED') {
            throw new common_1.BadRequestException('Không thể sửa công việc đã đóng');
        }
        const isReassigning = dto.assignee_id !== undefined && dto.assignee_id !== task.assignee_id;
        if (isReassigning && !isLead) {
            throw new common_1.ForbiddenException('Chỉ Leader mới được giao việc');
        }
        const updatedTask = await this.prisma.tasks.update({
            where: { id: taskId },
            data: {
                title: dto.title ?? task.title,
                description: dto.description ?? task.description,
                priority: dto.priority ?? task.priority,
                due_date: dto.due_date ? new Date(dto.due_date) : task.due_date,
                assignee_id: dto.assignee_id ?? task.assignee_id,
                assigner_id: isReassigning ? user.id : task.assigner_id,
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
        if (isReassigning && updatedTask.assignee_id) {
            await this.notifyAssignee(updatedTask, updatedTask.assignee_id, user.id);
        }
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
            throw new common_1.NotFoundException('Không tìm thấy công việc');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập công việc này');
        }
        const creatorCanDelete = task.creator_id === user.id &&
            (task.status === 'DRAFT' || task.status === 'REJECTED');
        if (!user.roles.includes('LEAD') && !creatorCanDelete) {
            throw new common_1.ForbiddenException('Bạn không có quyền xoá công việc này');
        }
        await this.prisma.tasks.update({
            where: { id: taskId },
            data: { deleted_at: new Date() },
        });
        return { message: 'Đã xoá công việc' };
    }
    async updateStatus(taskId, dto, user) {
        const task = await this.prisma.tasks.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new common_1.NotFoundException('Không tìm thấy công việc');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập công việc này');
        }
        const currentStatus = task.status;
        const newStatus = dto.status;
        const isCreator = task.creator_id === user.id;
        const isAssignee = task.assignee_id === user.id;
        if (!this.canTransition(currentStatus, newStatus, user.roles, isCreator, isAssignee)) {
            throw new common_1.ForbiddenException(`Không thể chuyển công việc từ "${STATUS_LABEL[currentStatus]}" sang "${STATUS_LABEL[newStatus]}"`);
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
            throw new common_1.NotFoundException('Không tìm thấy công việc');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập công việc này');
        }
        if (task.creator_id !== user.id) {
            throw new common_1.ForbiddenException('Chỉ người tạo mới được gửi duyệt công việc');
        }
        if (task.status !== 'DRAFT') {
            throw new common_1.BadRequestException('Chỉ công việc ở trạng thái Nháp mới gửi duyệt được');
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
            throw new common_1.ForbiddenException('Chỉ Trưởng nhóm mới được duyệt công việc');
        }
        const task = await this.prisma.tasks.findUnique({
            where: { id: dto.task_id },
        });
        if (!task) {
            throw new common_1.NotFoundException('Không tìm thấy công việc');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập công việc này');
        }
        if (task.status !== 'WAITING_APPROVAL') {
            throw new common_1.BadRequestException('Chỉ công việc đang chờ duyệt mới được phê duyệt');
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
            throw new common_1.ForbiddenException('Chỉ Trưởng nhóm mới được từ chối công việc');
        }
        const task = await this.prisma.tasks.findUnique({
            where: { id: dto.task_id },
        });
        if (!task) {
            throw new common_1.NotFoundException('Không tìm thấy công việc');
        }
        const hasAccess = await this.checkProjectAccess(task.project_id, user);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập công việc này');
        }
        if (task.status !== 'WAITING_APPROVAL') {
            throw new common_1.BadRequestException('Chỉ công việc đang chờ duyệt mới được từ chối');
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
exports.TasksService = TasksService = TasksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        notifications_service_1.NotificationsService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map