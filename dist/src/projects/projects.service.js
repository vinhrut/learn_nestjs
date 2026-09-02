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
var ProjectService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const notifications_service_1 = require("../notifications/notifications.service");
const PROJECT_ROLE_LABEL = {
    OWNER: 'Chủ sở hữu',
    MANAGER: 'Quản lý',
    MEMBER: 'Thành viên',
    VIEWER: 'Người xem',
};
let ProjectService = ProjectService_1 = class ProjectService {
    prisma;
    mail;
    notifications;
    logger = new common_1.Logger(ProjectService_1.name);
    constructor(prisma, mail, notifications) {
        this.prisma = prisma;
        this.mail = mail;
        this.notifications = notifications;
    }
    async create(dto, user) {
        if (!user.roles.includes('LEAD')) {
            throw new common_1.ForbiddenException('Chỉ Trưởng nhóm mới được tạo dự án');
        }
        const existingProject = await this.prisma.projects.findUnique({
            where: {
                code: dto.code,
            },
        });
        if (existingProject) {
            throw new common_1.ConflictException('Mã dự án đã tồn tại');
        }
        if (dto.member_ids && dto.member_ids.length > 0) {
            const users = await this.prisma.users.findMany({
                where: {
                    id: { in: dto.member_ids },
                    deleted_at: null,
                },
            });
            if (users.length !== dto.member_ids.length) {
                throw new common_1.NotFoundException('Có thành viên không hợp lệ');
            }
        }
        const project = await this.prisma.$transaction(async (tx) => {
            const project = await tx.projects.create({
                data: {
                    name: dto.name,
                    code: dto.code,
                    description: dto.description,
                    status: dto.status || 'PLANNING',
                    owner_id: user.id,
                },
            });
            await tx.project_members.create({
                data: {
                    project_id: project.id,
                    user_id: user.id,
                    project_role: 'OWNER',
                },
            });
            if (dto.member_ids && dto.member_ids.length > 0) {
                const otherMemberIds = dto.member_ids.filter((id) => id !== user.id);
                if (otherMemberIds.length > 0) {
                    await tx.project_members.createMany({
                        data: otherMemberIds.map((userId) => ({
                            project_id: project.id,
                            user_id: userId,
                            project_role: 'MEMBER',
                        })),
                    });
                }
            }
            return project;
        });
        const invitedIds = (dto.member_ids ?? []).filter((id) => id !== user.id);
        if (invitedIds.length > 0) {
            void this.notifyMembersAdded(project, invitedIds, 'MEMBER', user.id);
        }
        return project;
    }
    async findMyProjects(user) {
        if (user.roles.includes('LEAD')) {
            return this.prisma.projects.findMany({
                where: {
                    deleted_at: null,
                    OR: [
                        { owner_id: user.id },
                        { project_members: { some: { user_id: user.id } } },
                    ],
                },
                orderBy: {
                    created_at: 'desc',
                },
            });
        }
        return this.prisma.projects.findMany({
            where: {
                deleted_at: null,
                project_members: {
                    some: {
                        user_id: user.id,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }
    async findOne(projectId, user) {
        const project = await this.prisma.projects.findFirst({
            where: {
                id: projectId,
                deleted_at: null,
                OR: [
                    {
                        owner_id: user.id,
                    },
                    {
                        project_members: {
                            some: {
                                user_id: user.id,
                            },
                        },
                    },
                ],
            },
            include: {
                project_members: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                                full_name: true,
                            },
                        },
                    },
                },
                users: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                    },
                },
            },
        });
        if (!project) {
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập dự án này');
        }
        return project;
    }
    async getMembers(projectId, user) {
        const hasAccess = await this.prisma.projects.findFirst({
            where: {
                id: projectId,
                deleted_at: null,
                OR: [
                    { owner_id: user.id },
                    { project_members: { some: { user_id: user.id } } },
                ],
            },
        });
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập dự án này');
        }
        const members = await this.prisma.project_members.findMany({
            where: {
                project_id: projectId,
            },
            include: {
                users: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
            },
            orderBy: {
                joined_at: 'asc',
            },
        });
        return members.map((member) => ({
            project_id: member.project_id,
            user_id: member.user_id,
            project_role: member.project_role,
            joined_at: member.joined_at,
            user: member.users,
        }));
    }
    async getAvailableUsers(projectId, user) {
        const project = await this.prisma.projects.findUnique({
            where: {
                id: projectId,
            },
        });
        if (!project) {
            throw new common_1.NotFoundException('Không tìm thấy dự án');
        }
        if (project.owner_id !== user.id) {
            throw new common_1.ForbiddenException('Chỉ chủ sở hữu dự án mới xem được danh sách này');
        }
        const currentMemberIds = await this.prisma.project_members.findMany({
            where: {
                project_id: projectId,
            },
            select: {
                user_id: true,
            },
        });
        const excludedUserIds = currentMemberIds.map((m) => m.user_id);
        const availableUsers = await this.prisma.users.findMany({
            where: {
                deleted_at: null,
                status: 'ACTIVE',
                id: { notIn: excludedUserIds },
            },
            select: {
                id: true,
                username: true,
                email: true,
                full_name: true,
                avatar_url: true,
                user_roles: {
                    include: {
                        roles: true,
                    },
                },
            },
            orderBy: {
                full_name: 'asc',
            },
        });
        return availableUsers.map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            role: user.user_roles[0]?.roles.code || 'USER',
        }));
    }
    async update(projectId, dto, user) {
        const project = await this.prisma.projects.findUnique({
            where: {
                id: projectId,
            },
        });
        if (!project) {
            throw new common_1.NotFoundException('Không tìm thấy dự án');
        }
        if (project.owner_id !== user.id) {
            throw new common_1.ForbiddenException('Chỉ chủ sở hữu dự án mới được sửa dự án');
        }
        return this.prisma.projects.update({
            where: {
                id: projectId,
            },
            data: {
                ...dto,
            },
        });
    }
    async addMember(projectId, dto, user) {
        const project = await this.prisma.projects.findUnique({
            where: {
                id: projectId,
            },
        });
        if (!project) {
            throw new common_1.NotFoundException('Không tìm thấy dự án');
        }
        if (project.owner_id !== user.id) {
            throw new common_1.ForbiddenException('Chỉ chủ sở hữu dự án mới được thêm thành viên');
        }
        const targetUser = await this.prisma.users.findUnique({
            where: {
                id: dto.user_id,
            },
        });
        if (!targetUser) {
            throw new common_1.NotFoundException('Không tìm thấy người dùng');
        }
        const existingMember = await this.prisma.project_members.findUnique({
            where: {
                project_id_user_id: {
                    project_id: projectId,
                    user_id: dto.user_id,
                },
            },
        });
        if (existingMember) {
            throw new common_1.ConflictException('Người dùng đã là thành viên của dự án');
        }
        const member = await this.prisma.project_members.create({
            data: {
                project_id: projectId,
                user_id: dto.user_id,
                project_role: dto.project_role || 'MEMBER',
            },
        });
        void this.notifyMembersAdded(project, [dto.user_id], member.project_role, user.id);
        return member;
    }
    async notifyMembersAdded(project, memberIds, role, inviterId) {
        try {
            const [inviter, members] = await Promise.all([
                this.prisma.users.findUnique({
                    where: { id: inviterId },
                    select: { full_name: true, email: true },
                }),
                this.prisma.users.findMany({
                    where: { id: { in: memberIds }, deleted_at: null },
                    select: { id: true, email: true, full_name: true },
                }),
            ]);
            const inviterName = inviter?.full_name ?? inviter?.email ?? 'Quản trị viên';
            for (const member of members) {
                void this.mail.sendProjectMemberAddedEmail(member.email, {
                    projectName: project.name,
                    projectCode: project.code,
                    projectRole: PROJECT_ROLE_LABEL[role],
                    inviterName,
                    full_name: member.full_name ?? undefined,
                });
                void this.notifications.notify({
                    userId: member.id,
                    type: 'PROJECT_MEMBER_ADDED',
                    title: 'Bạn được thêm vào dự án',
                    message: `${project.code} — ${project.name}`,
                    extra: { projectId: project.id },
                });
            }
        }
        catch (error) {
            this.logger.error(`Không gửi được thông báo thêm thành viên (project=${project.id}): ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async removeMember(projectId, memberId, user) {
        const project = await this.prisma.projects.findUnique({
            where: {
                id: projectId,
            },
        });
        if (!project) {
            throw new common_1.NotFoundException('Không tìm thấy dự án');
        }
        if (project.owner_id !== user.id) {
            throw new common_1.ForbiddenException('Chỉ chủ sở hữu dự án mới được xoá thành viên');
        }
        if (memberId === project.owner_id) {
            throw new common_1.ForbiddenException('Không thể xoá chủ sở hữu khỏi dự án');
        }
        await this.prisma.project_members.delete({
            where: {
                project_id_user_id: {
                    project_id: projectId,
                    user_id: memberId,
                },
            },
        });
        return {
            message: 'Đã xoá thành viên khỏi dự án',
        };
    }
};
exports.ProjectService = ProjectService;
exports.ProjectService = ProjectService = ProjectService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        notifications_service_1.NotificationsService])
], ProjectService);
//# sourceMappingURL=projects.service.js.map