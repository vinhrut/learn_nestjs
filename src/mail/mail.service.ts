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

  // TODO: implement khi làm tính năng gửi OTP xác nhận đổi mật khẩu.
  // sendOtpEmail(
  //   to: string,
  //   data: { otp: string; expiresInMinutes: number },
  // ): Promise<void> {
  //   return this.sendTemplateMail(to, 'Mã xác nhận OTP', 'otp', data);
  // }

  // TODO: implement khi làm tính năng thông báo giao task.
  // sendTaskAssignedEmail(
  //   to: string,
  //   data: { taskName: string; assignedBy: string; dueDate?: Date },
  // ): Promise<void> {
  //   return this.sendTemplateMail(
  //     to,
  //     'Bạn được giao một task mới',
  //     'task-assigned',
  //     data,
  //   );
  // }
}
