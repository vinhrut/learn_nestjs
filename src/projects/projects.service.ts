import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProjectDto } from './dto/create.dto';
import { UpdateProjectDto } from './dto/update.dto';
import { AddProjectMemberDto } from './dto/add-project-memeber.dto';

import { JwtUser } from '../auth/types/jwt-payload.type';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CREATE PROJECT
  // =====================================================

  async create(dto: CreateProjectDto, user: JwtUser) {
    // Chỉ Leader được tạo project
    if (!user.roles.includes('LEAD')) {
      throw new ForbiddenException('Only Leader can create project');
    }

    // Kiểm tra project code đã tồn tại chưa
    const existingProject = await this.prisma.projects.findUnique({
      where: {
        code: dto.code,
      },
    });

    if (existingProject) {
      throw new ConflictException('Project code already exists');
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
        throw new NotFoundException('One or more member IDs are invalid');
      }
    }

    // Tạo project với transaction - đảm bảo owner được thêm vào project_members
    return this.prisma.$transaction(async (tx) => {
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
      throw new ForbiddenException('You do not have access to this project');
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
      throw new ForbiddenException('You do not have access to this project');
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
      throw new NotFoundException('Project not found');
    }

    if (project.owner_id !== user.id) {
      throw new ForbiddenException(
        'Only project owner can view available users',
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
      throw new NotFoundException('Project not found');
    }

    // Chỉ owner mới được sửa
    if (project.owner_id !== user.id) {
      throw new ForbiddenException('Only project owner can update project');
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
      throw new NotFoundException('Project not found');
    }

    // Chỉ owner mới được thêm member
    if (project.owner_id !== user.id) {
      throw new ForbiddenException('Only project owner can add members');
    }

    // Kiểm tra user tồn tại
    const targetUser = await this.prisma.users.findUnique({
      where: {
        id: dto.user_id,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
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
      throw new ConflictException('User is already a member of this project');
    }

    // Thêm member
    return this.prisma.project_members.create({
      data: {
        project_id: projectId,
        user_id: dto.user_id,
        project_role: dto.project_role || 'MEMBER',
      },
    });
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
      throw new NotFoundException('Project not found');
    }

    // Chỉ owner
    if (project.owner_id !== user.id) {
      throw new ForbiddenException('Only project owner can remove members');
    }

    // Không cho remove owner
    if (memberId === project.owner_id) {
      throw new ForbiddenException('Cannot remove project owner');
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
      message: 'Member removed successfully',
    };
  }
}
