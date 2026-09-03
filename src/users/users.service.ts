import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, role_code } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CloudinaryService } from '../common/helpers/cloudinary.helper';
import { normalizeSearchTerm } from '../common/helpers/search.helper';
import { CreateUserDto } from './dto/create-user.dto';
import { ADMIN_ONLY_FIELDS, UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

const userWithRoles = Prisma.validator<Prisma.usersDefaultArgs>()({
  include: { user_roles: { include: { roles: true } } },
});
type UserWithRoles = Prisma.usersGetPayload<typeof userWithRoles>;

export interface RequestUser {
  id: string;
  roles: string[];
}

export interface UploadedImageFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notifications: NotificationsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
      ...userWithRoles,
    });
  }

  findById(id: string) {
    return this.prisma.users.findUnique({
      where: { id },
      ...userWithRoles,
    });
  }

  toRoleCodes(user: UserWithRoles): role_code[] {
    return user.user_roles.map((userRole) => userRole.roles.code);
  }

  private sanitizeUser(user: UserWithRoles) {
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

  async create(dto: CreateUserDto) {
    const roleCodes = dto.roleCodes?.length ? dto.roleCodes : [role_code.USER];
    const roleRecords = await this.prisma.roles.findMany({
      where: { code: { in: roleCodes } },
    });
    if (roleRecords.length !== roleCodes.length) {
      throw new BadRequestException('Một hoặc nhiều role không tồn tại');
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
        message:
          'Quản trị viên đã tạo tài khoản cho bạn. Hãy đổi mật khẩu sau khi đăng nhập.',
      });

      return this.sanitizeUser(user);
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async findAll(query: QueryUserDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const term = query.search ? normalizeSearchTerm(query.search) : '';

    const where: Prisma.usersWhereInput = {
      deleted_at: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.role
        ? { user_roles: { some: { roles: { code: query.role } } } }
        : {}),
      // Khớp với cột STORED `search_text` (đã lower + bỏ dấu ở tầng DB),
      // nên tìm "nguyen" vẫn ra "Nguyễn". Không cần `mode: 'insensitive'`.
      ...(term ? { search_text: { contains: term } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.users.findMany({
        where,
        ...userWithRoles,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: query.order ?? 'desc' },
      }),
      this.prisma.users.count({ where }),
    ]);

    return {
      data: items.map((user) => this.sanitizeUser(user)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const user = await this.findActiveById(id);
    return this.sanitizeUser(user);
  }

  async update(id: string, dto: UpdateUserDto, requester: RequestUser) {
    const isAdmin = requester.roles.includes(role_code.ADMIN);
    if (!isAdmin) {
      const forbiddenField = ADMIN_ONLY_FIELDS.find(
        (field) => dto[field] !== undefined,
      );
      if (forbiddenField) {
        throw new ForbiddenException(
          `Bạn không có quyền cập nhật trường "${forbiddenField}"`,
        );
      }
    }

    const before = await this.findActiveById(id);

    const data: Prisma.usersUpdateInput = {
      full_name: dto.full_name,
      phone: dto.phone,
      avatar_url: dto.avatar_url,
      username: dto.username,
      email: dto.email,
      status: dto.status,
      updated_at: new Date(),
    };

    const avatarUrlChanged =
      dto.avatar_url !== undefined && dto.avatar_url !== before.avatar_url;
    if (avatarUrlChanged) {
      data.avatar_public_id = null;
    }

    if (dto.password) {
      data.password_hash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.roleCodes) {
      const roleRecords = await this.prisma.roles.findMany({
        where: { code: { in: dto.roleCodes } },
      });
      if (roleRecords.length !== dto.roleCodes.length) {
        throw new BadRequestException('Một hoặc nhiều role không tồn tại');
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

      if (avatarUrlChanged) {
        await this.destroyAvatarAsset(before.avatar_public_id);
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
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async updateAvatar(id: string, file: UploadedImageFile) {
    const before = await this.findActiveById(id);

    const uploaded = await this.cloudinary.uploadFile(file, {
      folder: 'avatars',
      publicId: `user-${id}-${Date.now()}`,
    });

    const user = await this.prisma.users.update({
      where: { id },
      data: {
        avatar_url: uploaded.url,
        avatar_public_id: uploaded.publicId,
        updated_at: new Date(),
      },
      ...userWithRoles,
    });

    if (before.avatar_public_id !== uploaded.publicId) {
      await this.destroyAvatarAsset(before.avatar_public_id);
    }

    return this.sanitizeUser(user);
  }

  async removeAvatar(id: string) {
    const before = await this.findActiveById(id);

    if (!before.avatar_url && !before.avatar_public_id) {
      return this.sanitizeUser(before);
    }

    const user = await this.prisma.users.update({
      where: { id },
      data: {
        avatar_url: null,
        avatar_public_id: null,
        updated_at: new Date(),
      },
      ...userWithRoles,
    });

    await this.destroyAvatarAsset(before.avatar_public_id);

    return this.sanitizeUser(user);
  }

  private async destroyAvatarAsset(publicId: string | null): Promise<void> {
    if (!publicId) return;
    try {
      await this.cloudinary.deleteFile(publicId, 'image');
    } catch (error) {
      console.error(
        'Không xoá được ảnh đại diện cũ trên Cloudinary:',
        publicId,
        error,
      );
    }
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        password_hash: await bcrypt.hash(newPassword, 10),
        updated_at: new Date(),
      },
    });
    await this.revokeActiveRefreshTokens(userId);
  }

  private diffUserChanges(before: UserWithRoles, dto: UpdateUserDto): string[] {
    const changes: string[] = [];
    const check = (
      value: string | undefined,
      current: string | null,
      label: string,
    ) => {
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

  async lock(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new BadRequestException('Không thể tự khoá tài khoản của mình');
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

  async unlock(id: string) {
    await this.findActiveById(id);
    const user = await this.prisma.users.update({
      where: { id },
      data: { status: 'ACTIVE', updated_at: new Date() },
      ...userWithRoles,
    });
    return this.sanitizeUser(user);
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new BadRequestException('Không thể tự xoá tài khoản của mình');
    }
    await this.findActiveById(id);

    await this.prisma.users.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    await this.revokeActiveRefreshTokens(id);
    return { success: true };
  }

  private async findActiveById(id: string): Promise<UserWithRoles> {
    const user = await this.prisma.users.findFirst({
      where: { id, deleted_at: null },
      ...userWithRoles,
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }
    return user;
  }

  private revokeActiveRefreshTokens(userId: string) {
    return this.prisma.refresh_tokens.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  private mapPrismaError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Username hoặc email đã tồn tại');
    }
    return error;
  }
}
