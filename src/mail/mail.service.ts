import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  private async sendTemplateMail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({ to, subject, template, context });
    } catch (error) {
      this.logger.error(
        `Gửi mail thất bại (to=${to}, template=${template}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  sendNewAccountEmail(
    to: string,
    data: { username: string; password: string; full_name?: string },
  ): Promise<void> {
    return this.sendTemplateMail(
      to,
      'Tài khoản của bạn đã được tạo',
      'new-account',
      data,
    );
  }

  /** Mã OTP cho luồng quên mật khẩu. */
  sendPasswordResetOtpEmail(
    to: string,
    data: { code: string; expiresInMinutes: number; full_name?: string },
  ): Promise<void> {
    return this.sendTemplateMail(
      to,
      'Mã xác nhận đặt lại mật khẩu',
      'password-reset-otp',
      {
        code: data.code,
        expiresInMinutes: data.expiresInMinutes,
        full_name: data.full_name ?? undefined,
      },
    );
  }

  /** Thông báo bảo mật sau khi mật khẩu được đổi (tự đổi hoặc đặt lại qua OTP). */
  sendPasswordChangedEmail(
    to: string,
    data: { full_name?: string },
  ): Promise<void> {
    return this.sendTemplateMail(
      to,
      'Mật khẩu của bạn đã được thay đổi',
      'password-changed',
      { full_name: data.full_name ?? undefined },
    );
  }

  /** Thông báo khi quản trị viên cập nhật thông tin tài khoản của user. */
  sendAccountUpdatedEmail(
    to: string,
    data: { changes: string[]; full_name?: string; temporaryPassword?: string },
  ): Promise<void> {
    return this.sendTemplateMail(
      to,
      'Thông tin tài khoản của bạn đã được cập nhật',
      'account-updated',
      {
        changes: data.changes,
        full_name: data.full_name ?? undefined,
        temporaryPassword: data.temporaryPassword ?? undefined,
      },
    );
  }

  /** Thông báo khi admin giao một công việc mới cho user. */
  sendTaskAssignedEmail(
    to: string,
    data: {
      taskTitle: string;
      assignerName: string;
      priority: string;
      dueDate?: string;
      full_name?: string;
    },
  ): Promise<void> {
    return this.sendTemplateMail(
      to,
      'Bạn được giao một công việc mới',
      'task-assigned',
      {
        taskTitle: data.taskTitle,
        assignerName: data.assignerName,
        priority: data.priority,
        dueDate: data.dueDate ?? undefined,
        full_name: data.full_name ?? undefined,
      },
    );
  }
}
