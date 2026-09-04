import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Gửi mail qua HTTP API của Brevo thay vì SMTP.
 * Lý do: Render free tier chặn toàn bộ outbound tới port SMTP (25/465/587)
 * từ 26/09/2025, nên nodemailer luôn bị "Connection timeout". API của Brevo
 * đi qua HTTPS (443) nên không dính giới hạn đó.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly templateCache = new Map<
    string,
    HandlebarsTemplateDelegate
  >();
  private readonly senderName: string;
  private readonly senderEmail: string;

  constructor(private readonly config: ConfigService) {
    // MAIL_FROM đang ở dạng `"LearnNest <email@example.com>"`, còn Brevo cần
    // tách riêng name và email nên phải bóc ra.
    const mailFrom = (this.config.get<string>('MAIL_FROM') ?? '').trim();
    const parsed = /^"?([^"<]*)"?\s*<(.+)>$/.exec(mailFrom);
    this.senderName = parsed?.[1]?.trim() || 'LearnNest';
    this.senderEmail =
      parsed?.[2]?.trim() ||
      mailFrom ||
      (this.config.get<string>('SMTP_USER') ?? '');
  }

  private async getTemplate(
    name: string,
  ): Promise<HandlebarsTemplateDelegate> {
    const cached = this.templateCache.get(name);
    if (cached) return cached;

    const source = await readFile(
      join(__dirname, 'templates', `${name}.hbs`),
      'utf8',
    );
    const compiled = Handlebars.compile(source);
    this.templateCache.set(name, compiled);
    return compiled;
  }

  private async sendTemplateMail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    try {
      const render = await this.getTemplate(template);
      const response = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'api-key': this.config.getOrThrow<string>('BREVO_API_KEY'),
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: render(context),
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Brevo trả về ${response.status} ${body}`);
      }
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
    data: { email: string; password: string; full_name?: string },
  ): Promise<void> {
    return this.sendTemplateMail(
      to,
      'Tài khoản của bạn đã được tạo',
      'new-account',
      {
        email: data.email,
        password: data.password,
        full_name: data.full_name ?? undefined,
      },
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

  /** Thông báo khi user được thêm vào một dự án. */
  sendProjectMemberAddedEmail(
    to: string,
    data: {
      projectName: string;
      projectCode: string;
      projectRole: string;
      inviterName: string;
      full_name?: string;
    },
  ): Promise<void> {
    return this.sendTemplateMail(
      to,
      'Bạn được thêm vào một dự án',
      'project-member-added',
      {
        projectName: data.projectName,
        projectCode: data.projectCode,
        projectRole: data.projectRole,
        inviterName: data.inviterName,
        full_name: data.full_name ?? undefined,
      },
    );
  }
}
