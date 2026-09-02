"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const notifications_service_1 = require("../notifications/notifications.service");
const update_user_dto_1 = require("./dto/update-user.dto");
const userWithRoles = client_1.Prisma.validator()({
    include: { user_roles: { include: { roles: true } } },
});
let UsersService = class UsersService {
    prisma;
    mailService;
    notifications;
    constructor(prisma, mailService, notifications) {
        this.prisma = prisma;
        this.mailService = mailService;
        this.notifications = notifications;
    }
    findByEmail(email) {
        return this.prisma.users.findUnique({
            where: { email },
            ...userWithRoles,
        });
    }
    findById(id) {
        return this.prisma.users.findUnique({
            where: { id },
            ...userWithRoles,
        });
    }
    toRoleCodes(user) {
        return user.user_roles.map((userRole) => userRole.roles.code);
    }
    sanitizeUser(user) {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            avatar_url: user.avatar_url,
            status: user.status,
            created_at: user.created_at,
            updated_at: user.updated_at,
            deleted_at: user.deleted_at,
            roles: this.toRoleCodes(user),
        };
    }
    async create(dto) {
        const roleCodes = dto.roleCodes?.length ? dto.roleCodes : [client_1.role_code.USER];
        const roleRecords = await this.prisma.roles.findMany({
            where: { code: { in: roleCodes } },
        });
        if (roleRecords.length !== roleCodes.length) {
            throw new common_1.BadRequestException('Một hoặc nhiều role không tồn tại');
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        try {
            const user = await this.prisma.users.create({
                data: {
                    username: dto.username,
                    email: dto.email,
                    password_hash: passwordHash,
                    full_name: dto.full_name,
                    phone: dto.phone,
                    avatar_url: dto.avatar_url,
                    user_roles: {
                        create: roleRecords.map((role) => ({ role_id: role.id })),
                    },
                },
                ...userWithRoles,
            });
            void this.mailService.sendNewAccountEmail(user.email, {
                email: user.email,
                password: dto.password,
                full_name: user.full_name ?? undefined,
            });
            void this.notifications.notify({
                userId: user.id,
                type: 'ACCOUNT_CREATED',
                title: 'Tài khoản của bạn đã được tạo',
                message: 'Quản trị viên đã tạo tài khoản cho bạn. Hãy đổi mật khẩu sau khi đăng nhập.',
            });
            return this.sanitizeUser(user);
        }
        catch (error) {
            throw this.mapPrismaError(error);
        }
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = {
            deleted_at: null,
            ...(query.status ? { status: query.status } : {}),
            ...(query.search
                ? {
                    OR: [
                        { username: { contains: query.search, mode: 'insensitive' } },
                        { email: { contains: query.search, mode: 'insensitive' } },
                        { full_name: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.users.findMany({
                where,
                ...userWithRoles,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.users.count({ where }),
        ]);
        return {
            data: items.map((user) => this.sanitizeUser(user)),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async findOne(id) {
        const user = await this.findActiveById(id);
        return this.sanitizeUser(user);
    }
    async update(id, dto, requester) {
        const isAdmin = requester.roles.includes(client_1.role_code.ADMIN);
        if (!isAdmin) {
            const forbiddenField = update_user_dto_1.ADMIN_ONLY_FIELDS.find((field) => dto[field] !== undefined);
            if (forbiddenField) {
                throw new common_1.ForbiddenException(`Bạn không có quyền cập nhật trường "${forbiddenField}"`);
            }
        }
        const before = await this.findActiveById(id);
        const data = {
            full_name: dto.full_name,
            phone: dto.phone,
            avatar_url: dto.avatar_url,
            username: dto.username,
            email: dto.email,
            status: dto.status,
            updated_at: new Date(),
        };
        if (dto.password) {
            data.password_hash = await bcrypt.hash(dto.password, 10);
        }
        if (dto.roleCodes) {
            const roleRecords = await this.prisma.roles.findMany({
                where: { code: { in: dto.roleCodes } },
            });
            if (roleRecords.length !== dto.roleCodes.length) {
                throw new common_1.BadRequestException('Một hoặc nhiều role không tồn tại');
            }
            data.user_roles = {
                deleteMany: {},
                create: roleRecords.map((role) => ({ role_id: role.id })),
            };
        }
        try {
            const user = await this.prisma.users.update({
                where: { id },
                data,
                ...userWithRoles,
            });
            if (dto.password) {
                await this.revokeActiveRefreshTokens(id);
            }
            if (isAdmin && requester.id !== id) {
                const changes = this.diffUserChanges(before, dto);
                if (changes.length > 0) {
                    void this.mailService.sendAccountUpdatedEmail(user.email, {
                        full_name: user.full_name ?? undefined,
                        changes,
                        temporaryPassword: dto.password ?? undefined,
                    });
                    void this.notifications.notify({
                        userId: id,
                        type: 'ACCOUNT_UPDATED',
                        title: 'Thông tin tài khoản của bạn đã được cập nhật',
                        message: changes.join(', '),
                    });
                }
            }
            return this.sanitizeUser(user);
        }
        catch (error) {
            throw this.mapPrismaError(error);
        }
    }
    async changePassword(userId, newPassword) {
        await this.prisma.users.update({
            where: { id: userId },
            data: {
                password_hash: await bcrypt.hash(newPassword, 10),
                updated_at: new Date(),
            },
        });
        await this.revokeActiveRefreshTokens(userId);
    }
    diffUserChanges(before, dto) {
        const changes = [];
        const check = (value, current, label) => {
            if (value !== undefined && value !== (current ?? '')) {
                changes.push(label);
            }
        };
        check(dto.full_name, before.full_name, 'Họ và tên');
        check(dto.phone, before.phone, 'Số điện thoại');
        check(dto.avatar_url, before.avatar_url, 'Ảnh đại diện');
        check(dto.username, before.username, 'Tên đăng nhập');
        check(dto.email, before.email, 'Email');
        if (dto.status !== undefined && dto.status !== before.status) {
            changes.push('Trạng thái');
        }
        if (dto.roleCodes) {
            const currentRoles = [...this.toRoleCodes(before)].sort().join(',');
            const nextRoles = [...dto.roleCodes].sort().join(',');
            if (currentRoles !== nextRoles) {
                changes.push('Vai trò');
            }
        }
        if (dto.password) {
            changes.push('Mật khẩu');
        }
        return changes;
    }
    async lock(id, requesterId) {
        if (id === requesterId) {
            throw new common_1.BadRequestException('Không thể tự khoá tài khoản của mình');
        }
        await this.findActiveById(id);
        const user = await this.prisma.users.update({
            where: { id },
            data: { status: 'LOCKED', updated_at: new Date() },
            ...userWithRoles,
        });
        await this.revokeActiveRefreshTokens(id);
        return this.sanitizeUser(user);
    }
    async unlock(id) {
        await this.findActiveById(id);
        const user = await this.prisma.users.update({
            where: { id },
            data: { status: 'ACTIVE', updated_at: new Date() },
            ...userWithRoles,
        });
        return this.sanitizeUser(user);
    }
    async remove(id, requesterId) {
        if (id === requesterId) {
            throw new common_1.BadRequestException('Không thể tự xoá tài khoản của mình');
        }
        await this.findActiveById(id);
        await this.prisma.users.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
        await this.revokeActiveRefreshTokens(id);
        return { success: true };
    }
    async findActiveById(id) {
        const user = await this.prisma.users.findFirst({
            where: { id, deleted_at: null },
            ...userWithRoles,
        });
        if (!user) {
            throw new common_1.NotFoundException('Không tìm thấy user');
        }
        return user;
    }
    revokeActiveRefreshTokens(userId) {
        return this.prisma.refresh_tokens.updateMany({
            where: { user_id: userId, revoked_at: null },
            data: { revoked_at: new Date() },
        });
    }
    mapPrismaError(error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002') {
            return new common_1.ConflictException('Username hoặc email đã tồn tại');
        }
        return error;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        notifications_service_1.NotificationsService])
], UsersService);
//# sourceMappingURL=users.service.js.map