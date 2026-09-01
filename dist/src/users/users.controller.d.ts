import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UsersService } from './users.service';
import type { RequestUser } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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
    remove(id: string, requester: RequestUser): Promise<{
        success: boolean;
    }>;
    lock(id: string, requester: RequestUser): Promise<{
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
}
