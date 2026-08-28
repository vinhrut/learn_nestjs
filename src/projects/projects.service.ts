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
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =====================================================
  // CREATE PROJECT
  // =====================================================

  async create(
    dto: CreateProjectDto,
    user: JwtUser,
  ) {
    // Chỉ Leader được tạo project
if (!user.roles.includes('LEADER')) {
  throw new ForbiddenException(
    'Only Leader can create project',
  );
}

    const existingProject =
      await this.prisma.projects.findUnique({
        where: {
          code: dto.code,
        },
      });

    if (existingProject) {
      throw new ConflictException(
        'Project code already exists',
      );
    }

    return this.prisma.projects.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,

        // Người đang login là owner
        owner_id: user.id,
      },
    });
  }

  // =====================================================
  // GET MY PROJECTS
  // =====================================================

  async findMyProjects(user: JwtUser) {
    // Leader
    if (user.roles.includes('LEADER'))  {
      return this.prisma.projects.findMany({
        where: {
          owner_id: user.id,
          deleted_at: null,
        },

        orderBy: {
          created_at: 'desc',
        },
      });
    }

    // BA / DEV
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

  async findOne(
    projectId: string,
    user: JwtUser,
  ) {
    const project =
      await this.prisma.projects.findFirst({
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
                  email: true,                },
              },
            },
          },
        },
      });

    if (!project) {
      throw new ForbiddenException(
        'You do not have access to this project',
      );
    }

    return project;
  }

  // =====================================================
  // UPDATE PROJECT
  // =====================================================

  async update(
    projectId: string,
    dto: UpdateProjectDto,
    user: JwtUser,
  ) {
    const project =
      await this.prisma.projects.findUnique({
        where: {
          id: projectId,
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    // Chỉ owner mới được sửa
    if (project.owner_id !== user.id) {
      throw new ForbiddenException(
        'Only project owner can update project',
      );
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

  async addMember(
    projectId: string,
    dto: AddProjectMemberDto,
    user: JwtUser,
  ) {
    // Tìm project
    const project =
      await this.prisma.projects.findUnique({
        where: {
          id: projectId,
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    // Chỉ owner mới được thêm member
    if (project.owner_id !== user.id) {
      throw new ForbiddenException(
        'Only project owner can add members',
      );
    }

    // Kiểm tra user tồn tại
    const targetUser =
      await this.prisma.users.findUnique({
        where: {
          id: dto.user_id,
        },
      });

    if (!targetUser) {
      throw new NotFoundException(
        'User not found',
      );
    }

    // Kiểm tra đã tồn tại
    const existingMember =
      await this.prisma.project_members.findUnique({
        where: {
          project_id_user_id: {
            project_id: projectId,
            user_id: dto.user_id,
          },
        },
      });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this project',
      );
    }

    // Thêm member
    return this.prisma.project_members.create({
      data: {
        project_id: projectId,
        user_id: dto.user_id,
        project_role: dto.project_role,
      },
    });
  }

  // =====================================================
  // REMOVE MEMBER
  // =====================================================

  async removeMember(
    projectId: string,
    memberId: string,
    user: JwtUser,
  ) {
    const project =
      await this.prisma.projects.findUnique({
        where: {
          id: projectId,
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    // Chỉ owner
    if (project.owner_id !== user.id) {
      throw new ForbiddenException(
        'Only project owner can remove members',
      );
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