import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create.dto';
import { UpdateProjectDto } from './dto/update.dto';
import { AddProjectMemberDto } from './dto/add-project-memeber.dto';
import { JwtUser } from '../auth/types/jwt-payload.type';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class ProjectService {
    private readonly prisma;
    private readonly mail;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, mail: MailService, notifications: NotificationsService);
    create(dto: CreateProjectDto, user: JwtUser): Promise<{
        status: import("@prisma/client").$Enums.project_status;
        id: string;
        code: string;
        name: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        owner_id: string;
    }>;
    findMyProjects(user: JwtUser): Promise<{
        status: import("@prisma/client").$Enums.project_status;
        id: string;
        code: string;
        name: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        owner_id: string;
    }[]>;
    findOne(projectId: string, user: JwtUser): Promise<{
        project_members: ({
            users: {
                id: string;
                username: string;
                email: string;
                full_name: string | null;
            };
        } & {
            user_id: string;
            project_role: import("@prisma/client").$Enums.project_member_role;
            joined_at: Date;
            project_id: string;
        })[];
        users: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
        };
    } & {
        status: import("@prisma/client").$Enums.project_status;
        id: string;
        code: string;
        name: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        owner_id: string;
    }>;
    getMembers(projectId: string, user: JwtUser): Promise<{
        project_id: string;
        user_id: string;
        project_role: import("@prisma/client").$Enums.project_member_role;
        joined_at: Date;
        user: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            avatar_url: string | null;
        };
    }[]>;
    getAvailableUsers(projectId: string, user: JwtUser): Promise<{
        id: string;
        username: string;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
        role: import("@prisma/client").$Enums.role_code;
    }[]>;
    update(projectId: string, dto: UpdateProjectDto, user: JwtUser): Promise<{
        status: import("@prisma/client").$Enums.project_status;
        id: string;
        code: string;
        name: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        owner_id: string;
    }>;
    addMember(projectId: string, dto: AddProjectMemberDto, user: JwtUser): Promise<{
        user_id: string;
        project_role: import("@prisma/client").$Enums.project_member_role;
        joined_at: Date;
        project_id: string;
    }>;
    private notifyMembersAdded;
    removeMember(projectId: string, memberId: string, user: JwtUser): Promise<{
        message: string;
    }>;
}
