import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { otp_purpose } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Dịch vụ mã OTP dùng chung (tham số hoá theo `purpose` để tái sử dụng cho các
 * tính năng sau: xác minh email, ...). Mã được hash bằng bcrypt trước khi lưu.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private num(key: string, fallback: number): number {
    const parsed = Number(this.config.get<string>(key));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private get ttlMinutes(): number {
    return this.num('OTP_TTL_MINUTES', 10);
  }

  private get maxAttempts(): number {
    return this.num('OTP_MAX_ATTEMPTS', 5);
  }

  private get resendCooldownSeconds(): number {
    return this.num('OTP_RESEND_COOLDOWN_SECONDS', 60);
  }

  private get codeLength(): number {
    return this.num('OTP_LENGTH', 6);
  }

  /**
   * Phát hành một mã OTP mới cho `(userId, purpose)`.
   * - Trả về `null` nếu đang trong thời gian chờ gửi lại (cooldown) — caller nên
   *   im lặng bỏ qua (không gửi mail, không báo lỗi).
   * - Vô hiệu hoá mọi mã chưa dùng trước đó của cùng `(userId, purpose)`.
   */
  async issue(
    userId: string,
    purpose: otp_purpose,
  ): Promise<{ code: string; expiresInMinutes: number } | null> {
    const now = new Date();

    // Dọn rác các mã đã hết hạn (lười, không cần cron).
    await this.prisma.otp_codes.deleteMany({
      where: { expires_at: { lt: now } },
    });

    const latest = await this.prisma.otp_codes.findFirst({
      where: { user_id: userId, purpose, consumed_at: null },
      orderBy: { created_at: 'desc' },
    });
    if (latest) {
      const ageSeconds = (now.getTime() - latest.created_at.getTime()) / 1000;
      if (ageSeconds < this.resendCooldownSeconds) {
        return null;
      }
    }

    await this.prisma.otp_codes.updateMany({
      where: { user_id: userId, purpose, consumed_at: null },
      data: { consumed_at: now },
    });

    const code = this.generateCode();
    const expiresInMinutes = this.ttlMinutes;

    await this.prisma.otp_codes.create({
      data: {
        user_id: userId,
        purpose,
        code_hash: await bcrypt.hash(code, 10),
        expires_at: new Date(now.getTime() + expiresInMinutes * 60_000),
      },
    });

    if (this.config.get<string>('OTP_DEBUG_LOG') === 'true') {
      this.logger.debug(
        `[DEV] OTP ${purpose} cho user=${userId}: ${code} (hết hạn sau ${expiresInMinutes} phút)`,
      );
    }

    return { code, expiresInMinutes };
  }

  /**
   * Kiểm tra mã và đánh dấu đã dùng nếu đúng. Ném `BadRequestException` với thông
   * báo tiếng Việt nếu mã sai / hết hạn / quá số lần thử.
   */
  async verifyAndConsume(
    userId: string,
    purpose: otp_purpose,
    code: string,
  ): Promise<void> {
    const record = await this.prisma.otp_codes.findFirst({
      where: {
        user_id: userId,
        purpose,
        consumed_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
    }

    if (record.attempts >= this.maxAttempts) {
      await this.prisma.otp_codes.update({
        where: { id: record.id },
        data: { consumed_at: new Date() },
      });
      throw new BadRequestException(
        'Bạn đã nhập sai quá số lần cho phép, vui lòng yêu cầu mã mới',
      );
    }

    const matches = await bcrypt.compare(code, record.code_hash);
    if (!matches) {
      await this.prisma.otp_codes.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Mã xác nhận không đúng');
    }

    await this.prisma.otp_codes.update({
      where: { id: record.id },
      data: { consumed_at: new Date() },
    });
  }

  private generateCode(): string {
    const max = 10 ** this.codeLength;
    return randomInt(0, max).toString().padStart(this.codeLength, '0');
  }
}
