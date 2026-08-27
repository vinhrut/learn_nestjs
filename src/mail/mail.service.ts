import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

/**
 * MailService là điểm gửi mail DUY NHẤT của toàn hệ thống.
 * Mọi tính năng cần gửi email (tạo tài khoản, OTP đổi mật khẩu, thông báo
 * giao task...) nên thêm 1 method nghiệp vụ ở đây, tái sử dụng lại
 * `sendTemplateMail` bên dưới thay vì tự gọi MailerService riêng lẻ.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Method lõi tổng quát: gửi mail theo template Handlebars trong
   * src/mail/templates/*.hbs. Không bao giờ throw ra ngoài — lỗi gửi mail
   * (SMTP down, sai cấu hình...) chỉ được log lại, không được phép làm hỏng
   * luồng nghiệp vụ đang gọi nó (tạo user, đổi mật khẩu, giao task...).
   */
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

  /** Gửi thông tin đăng nhập khi ADMIN tạo tài khoản mới. */
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
