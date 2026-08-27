import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { OtpService } from '../otp/otp.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, RefreshJwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || user.deleted_at || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.username,
      this.usersService.toRoleCodes(user),
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        status: user.status,
        roles: this.usersService.toRoleCodes(user),
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refresh_tokens.findFirst({
      where: {
        user_id: payload.sub,
        token_hash: tokenHash,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
    });
    if (!stored) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.deleted_at || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    await this.prisma.refresh_tokens.update({
      where: { id: stored.id },
      data: { revoked_at: new Date() },
    });

    return this.issueTokens(
      user.id,
      user.email,
      user.username,
      this.usersService.toRoleCodes(user),
    );
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refresh_tokens.findFirst({
      where: {
        user_id: userId,
        token_hash: tokenHash,
        revoked_at: null,
      },
    });

    if (stored) {
      await this.prisma.refresh_tokens.update({
        where: { id: stored.id },
        data: { revoked_at: new Date() },
      });
    }

    return { success: true };
  }

  /**
   * Quên mật khẩu: gửi mã OTP về email. Luôn kết thúc êm (không tiết lộ email có
   * tồn tại hay không, không báo lỗi khi đang trong thời gian chờ gửi lại).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.deleted_at || user.status !== 'ACTIVE') {
      return;
    }

    const issued = await this.otpService.issue(user.id, 'PASSWORD_RESET');
    if (!issued) {
      return;
    }

    void this.mailService.sendPasswordResetOtpEmail(user.email, {
      code: issued.code,
      expiresInMinutes: issued.expiresInMinutes,
      full_name: user.full_name ?? undefined,
    });
  }

  /** Đặt lại mật khẩu bằng mã OTP nhận qua email. */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<void> {
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('Xác nhận mật khẩu không khớp');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user || user.deleted_at || user.status !== 'ACTIVE') {
      throw new BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
    }

    await this.otpService.verifyAndConsume(user.id, 'PASSWORD_RESET', code);
    await this.usersService.changePassword(user.id, newPassword);

    void this.mailService.sendPasswordChangedEmail(user.email, {
      full_name: user.full_name ?? undefined,
    });
  }

  /** Đổi mật khẩu khi đang đăng nhập: xác thực mật khẩu hiện tại (không cần OTP). */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<void> {
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('Xác nhận mật khẩu không khớp');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }

    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    await this.usersService.changePassword(userId, newPassword);

    void this.mailService.sendPasswordChangedEmail(user.email, {
      full_name: user.full_name ?? undefined,
    });
  }

  private async issueTokens(
    userId: string,
    email: string,
    username: string,
    roles: string[],
  ) {
    const accessPayload: JwtPayload = { sub: userId, email, username, roles };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.getOrThrow<StringValue>(
        'JWT_ACCESS_EXPIRES_IN',
      ),
    });

    const refreshExpiresIn = this.configService.getOrThrow<StringValue>(
      'JWT_REFRESH_EXPIRES_IN',
    );
    const refreshPayload: RefreshJwtPayload = {
      sub: userId,
      jti: randomUUID(),
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn,
    });

    await this.prisma.refresh_tokens.create({
      data: {
        user_id: userId,
        token_hash: this.hashToken(refreshToken),
        expires_at: this.addDuration(new Date(), refreshExpiresIn),
      },
    });

    return { accessToken, refreshToken };
  }

  private verifyRefreshToken(refreshToken: string): RefreshJwtPayload {
    try {
      return this.jwtService.verify<RefreshJwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private addDuration(from: Date, duration: string) {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }
    const value = Number(match[1]);
    const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
      match[2] as 's' | 'm' | 'h' | 'd'
    ];
    return new Date(from.getTime() + value * unitMs);
  }
}
