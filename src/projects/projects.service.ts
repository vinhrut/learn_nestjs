import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { project_member_role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProjectDto } from './dto/create.dto';
import { UpdateProjectDto } from './dto/update.dto';
import { AddProjectMemberDto } from './dto/add-project-memeber.dto';

import { JwtUser } from '../auth/types/jwt-payload.type';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

const PROJECT_ROLE_LABEL: Record<project_member_role, string> = {
  OWNER: 'Chủ sở hữu',
  MANAGER: 'Quản lý',
  MEMBER: 'Thành viên',
  VIEWER: 'Người xem',
};

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  // =====================================================
  // CREATE PROJECT
  // =====================================================

  async create(dto: CreateProjectDto, user: JwtUser) {
    // Chỉ Leader được tạo project
    if (!user.roles.includes('LEAD')) {
      throw new ForbiddenException('Chỉ Trưởng nhóm mới được tạo dự án');
    }

    // Kiểm tra project code đã tồn tại chưa
    const existingProject = await this.prisma.projects.findUnique({
      where: {
        code: dto.code,
      },
    });

    if (existingProject) {
      throw new ConflictException('Mã dự án đã tồn tại');
    }

    // Validate member_ids nếu có
    if (dto.member_ids && dto.member_ids.length > 0) {
      const users = await this.prisma.users.findMany({
        where: {
          id: { in: dto.member_ids },
          deleted_at: null,
        },
      });

      if (users.length !== dto.member_ids.length) {
        throw new NotFoundException('Có thành viên không hợp lệ');
      }
    }

    // Tạo project với transaction - đảm bảo owner được thêm vào project_members
    const project = await this.prisma.$transaction(async (tx) => {
      // Tạo project
      const project = await tx.projects.create({
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          status: dto.status || 'PLANNING',
          owner_id: user.id,
        },
      });

      // Thêm owner vào project_members với role OWNER
      await tx.project_members.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          project_role: 'OWNER',
        },
      });

      // Thêm các members khác nếu có
      if (dto.member_ids && dto.member_ids.length > 0) {
        // Loại trừ owner khỏi member_ids (phòng trường hợp trùng)
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

  // =====================================================
  // GET MY PROJECTS
  // =====================================================

  async findMyProjects(user: JwtUser) {
    // Leader - thấy tất cả project mình là owner hoặc là member
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

    // BA / DEV - chỉ thấy project trong project_members
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

  // =====================================================
  // GET PROJECT DETAIL
  // =====================================================

  async findOne(projectId: string, user: JwtUser) {
    const project = await this.prisma.projects.findFirst({
      where: {
        id: projectId,
        deleted_at: null,

        OR: [
          // Owner
          {
            owner_id: user.id,
          },

          // Member
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
      throw new ForbiddenException('Bạn không có quyền truy cập dự án này');
    }

    return project;
  }

  // =====================================================
  // GET PROJECT MEMBERS
  // =====================================================

  async getMembers(projectId: string, user: JwtUser) {
    // Kiểm tra quyền truy cập project
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
      throw new ForbiddenException('Bạn không có quyền truy cập dự án này');
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

  // =====================================================
  // GET AVAILABLE USERS (chưa thuộc project)
  // =====================================================

  async getAvailableUsers(projectId: string, user: JwtUser) {
    // Chỉ owner mới được xem available users
    const project = await this.prisma.projects.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy dự án');
    }

    if (project.owner_id !== user.id) {
      throw new ForbiddenException(
        'Chỉ chủ sở hữu dự án mới xem được danh sách này',
      );
    }

    // Lấy tất cả user active không thuộc project này
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

  // =====================================================
  // UPDATE PROJECT
  // =====================================================

  async update(projectId: string, dto: UpdateProjectDto, user: JwtUser) {
    const project = await this.prisma.projects.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy dự án');
    }

    // Chỉ owner mới được sửa
    if (project.owner_id !== user.id) {
      throw new ForbiddenException('Chỉ chủ sở hữu dự án mới được sửa dự án');
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

  // =====================================================
  // ADD MEMBER
  // =====================================================

  async addMember(projectId: string, dto: AddProjectMemberDto, user: JwtUser) {
    // Tìm project
    const project = await this.prisma.projects.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy dự án');
    }

    // Chỉ owner mới được thêm member
    if (project.owner_id !== user.id) {
      throw new ForbiddenException(
        'Chỉ chủ sở hữu dự án mới được thêm thành viên',
      );
    }

    // Kiểm tra user tồn tại
    const targetUser = await this.prisma.users.findUnique({
      where: {
        id: dto.user_id,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Kiểm tra đã tồn tại
    const existingMember = await this.prisma.project_members.findUnique({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: dto.user_id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('Người dùng đã là thành viên của dự án');
    }

    // Thêm member
    const member = await this.prisma.project_members.create({
      data: {
        project_id: projectId,
        user_id: dto.user_id,
        project_role: dto.project_role || 'MEMBER',
      },
    });

    void this.notifyMembersAdded(
      project,
      [dto.user_id],
      member.project_role,
      user.id,
    );

    return member;
  }

  // =====================================================
  // NOTIFY MEMBERS ADDED
  // =====================================================

  private async notifyMembersAdded(
    project: { id: string; name: string; code: string },
    memberIds: string[],
    role: project_member_role,
    inviterId: string,
  ): Promise<void> {
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

      const inviterName =
        inviter?.full_name ?? inviter?.email ?? 'Quản trị viên';

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
          projectId: project.id,
        });
      }
    } catch (error) {
      this.logger.error(
        `Không gửi được thông báo thêm thành viên (project=${project.id}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // =====================================================
  // REMOVE MEMBER
  // =====================================================

  async removeMember(projectId: string, memberId: string, user: JwtUser) {
    const project = await this.prisma.projects.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy dự án');
    }

    // Chỉ owner
    if (project.owner_id !== user.id) {
      throw new ForbiddenException(
        'Chỉ chủ sở hữu dự án mới được xoá thành viên',
      );
    }

    // Không cho remove owner
    if (memberId === project.owner_id) {
      throw new ForbiddenException('Không thể xoá chủ sở hữu khỏi dự án');
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
}
