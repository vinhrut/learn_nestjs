import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SetupService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Setup database - tạo bảng và seed data
   */
  async migrateAndSeed(): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      // Tạo bảng roles
      await this.createRolesTable();

      // Tạo bảng users
      await this.createUsersTable();

      // Tạo bảng user_roles
      await this.createUserRolesTable();

      // Seed roles
      await this.seedRoles();

      // Tạo admin user nếu chưa có
      const adminResult = await this.createAdminIfNotExists();

      return {
        success: true,
        message: 'Setup thành công!',
        data: {
          roles: 'Đã tạo/seeds roles mặc định',
          admin: adminResult,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Setup error:', error);
      return {
        success: false,
        message: `Lỗi: ${errorMessage}`,
      };
    }
  }

  private async createRolesTable(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async createUsersTable(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        phone VARCHAR(50),
        avatar_url TEXT,
        avatar_public_id TEXT,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        search_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);
  }

  private async createUserRolesTable(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role_id)
      )
    `);
  }

  private async seedRoles(): Promise<void> {
    const roles = [
      { name: 'Administrator', code: 'ADMIN' },
      { name: 'Leader', code: 'LEAD' },
      { name: 'Business Analyst', code: 'BA' },
      { name: 'Developer', code: 'USER' },
    ];

    for (const role of roles) {
      try {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO roles (name, code) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`,
          role.name,
          role.code,
        );
      } catch {
        // Ignore duplicate errors
      }
    }
  }

  private async createAdminIfNotExists(): Promise<string> {
    // Check if admin exists
    const existingAdmin = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT u.id FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.code = 'ADMIN' AND u.deleted_at IS NULL
       LIMIT 1`,
    );

    if (existingAdmin.length > 0) {
      return 'Admin đã tồn tại';
    }

    // Get admin role
    const adminRole = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM roles WHERE code = 'ADMIN' LIMIT 1`,
    );

    if (adminRole.length === 0) {
      throw new Error('Role ADMIN không tồn tại');
    }

    const passwordHash = await bcrypt.hash('Admin123!', 10);
    const userId = crypto.randomUUID();

    // Create admin user
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO users (id, username, email, password_hash, full_name, status)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
       ON CONFLICT (email) DO NOTHING`,
      userId,
      'admin',
      'admin@learnnest.com',
      passwordHash,
      'Administrator',
    );

    // Assign admin role
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      userId,
      adminRole[0].id,
    );

    return 'Đã tạo admin user (admin@learnnest.com / Admin123!)';
  }
}
