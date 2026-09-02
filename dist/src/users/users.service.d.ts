import { Prisma, role_code } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
declare const userWithRoles: {
    include: {
        user_roles: {
            include: {
                roles: true;
            };
        };
    };
};
type UserWithRoles = Prisma.usersGetPayload<typeof userWithRoles>;
export interface RequestUser {
    id: string;
    roles: string[];
}
export declare class UsersService {
    private readonly prisma;
    private readonly mailService;
    private readonly notifications;
    constructor(prisma: PrismaService, mailService: MailService, notifications: NotificationsService);
    findByEmail(email: string): Prisma.Prisma__usersClient<({
        user_roles: ({
            roles: {
                id: string;
                code: import("@prisma/client").$Enums.role_code;
                name: string;
                description: string | null;
                created_at: Date;
                updated_at: Date;
            };
        } & {
            created_at: Date;
            user_id: string;
            role_id: string;
        })[];
    } & {
        status: import("@prisma/client").$Enums.user_status;
        id: string;
        created_at: Date;
        updated_at: Date;
        username: string;
        email: string;
        password_hash: string;
        full_name: string | null;
        phone: string | null;
        avatar_url: string | null;
        deleted_at: Date | null;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    findById(id: string): Prisma.Prisma__usersClient<({
        user_roles: ({
            roles: {
                id: string;
                code: import("@prisma/client").$Enums.role_code;
                name: string;
                description: string | null;
                created_at: Date;
                updated_at: Date;
            };
        } & {
            created_at: Date;
            user_id: string;
            role_id: string;
        })[];
    } & {
        status: import("@prisma/client").$Enums.user_status;
        id: string;
        created_at: Date;
        updated_at: Date;
        username: string;
        email: string;
        password_hash: string;
        full_name: string | null;
        phone: string | null;
        avatar_url: string | null;
        deleted_at: Date | null;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    toRoleCodes(user: UserWithRoles): role_code[];
    private sanitizeUser;
    create(dto: CreateUserDto): Promise<{
        id: string;
        username: string;
        email: string;
        full_name: string | null;
        phone: string | null;
        avatar_url: string | null;
        status: import("@prisma/client").$Enums.user_status;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        roles: import("@prisma/client").$Enums.role_code[];
    }>;
    findAll(query: QueryUserDto): Promise<{
        data: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            phone: string | null;
            avatar_url: string | null;
            status: import("@prisma/client").$Enums.user_status;
            created_at: Date;
            updated_at: Date;
            deleted_at: Date | null;
            roles: import("@prisma/client").$Enums.role_code[];
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        id: string;
        username: string;
        email: string;
        full_name: string | null;
        phone: string | null;
        avatar_url: string | null;
        status: import("@prisma/client").$Enums.user_status;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        roles: import("@prisma/client").$Enums.role_code[];
    }>;
    update(id: string, dto: UpdateUserDto, requester: RequestUser): Promise<{
        id: string;
        username: string;
        email: string;
        full_name: string | null;
        phone: string | null;
        avatar_url: string | null;
        status: import("@prisma/client").$Enums.user_status;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        roles: import("@prisma/client").$Enums.role_code[];
    }>;
    changePassword(userId: string, newPassword: string): Promise<void>;
    private diffUserChanges;
    lock(id: string, requesterId: string): Promise<{
        id: string;
        username: string;
        email: string;
        full_name: string | null;
        phone: string | null;
        avatar_url: string | null;
        status: import("@prisma/client").$Enums.user_status;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        roles: import("@prisma/client").$Enums.role_code[];
    }>;
    unlock(id: string): Promise<{
        id: string;
        username: string;
        email: string;
        full_name: string | null;
        phone: string | null;
        avatar_url: string | null;
        status: import("@prisma/client").$Enums.user_status;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        roles: import("@prisma/client").$Enums.role_code[];
    }>;
    remove(id: string, requesterId: string): Promise<{
        success: boolean;
    }>;
    private findActiveById;
    private revokeActiveRefreshTokens;
    private mapPrismaError;
}
export {};
