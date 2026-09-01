import { MailerService } from '@nestjs-modules/mailer';
export declare class MailService {
    private readonly mailerService;
    private readonly logger;
    constructor(mailerService: MailerService);
    private sendTemplateMail;
    sendNewAccountEmail(to: string, data: {
        username: string;
        password: string;
        full_name?: string;
    }): Promise<void>;
    sendPasswordResetOtpEmail(to: string, data: {
        code: string;
        expiresInMinutes: number;
        full_name?: string;
    }): Promise<void>;
    sendPasswordChangedEmail(to: string, data: {
        full_name?: string;
    }): Promise<void>;
    sendAccountUpdatedEmail(to: string, data: {
        changes: string[];
        full_name?: string;
        temporaryPassword?: string;
    }): Promise<void>;
}
