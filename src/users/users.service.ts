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

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
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

      // Gửi thông tin tài khoản (username + mật khẩu tạm thời) về email của
      // user vừa tạo. Dùng dto.password (plaintext) vì đây là chỗ duy nhất
      // trong luồng còn giữ nó trước khi bị hash ở trên.
      // Cố ý KHÔNG await: request tạo user phải trả về ngay khi ghi DB xong,
      // không chờ SMTP. MailService.sendTemplateMail() tự bắt lỗi bên trong
      // nên promise này không bao giờ reject (không cần .catch() ở đây).
      void this.mailService.sendNewAccountEmail(user.email, {
        username: user.username,
        password: dto.password,
        full_name: user.full_name ?? undefined,
      });

      return this.sanitizeUser(user);
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async findAll(query: QueryUserDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.usersWhereInput = {
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

    await this.findActiveById(id);

    const data: Prisma.usersUpdateInput = {
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
      return this.sanitizeUser(user);
    } catch (error) {
      throw this.mapPrismaError(error);
    }
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
