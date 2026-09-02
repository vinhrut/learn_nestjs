"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const mailer_1 = require("@nestjs-modules/mailer");
let MailService = MailService_1 = class MailService {
    mailerService;
    logger = new common_1.Logger(MailService_1.name);
    constructor(mailerService) {
        this.mailerService = mailerService;
    }
    async sendTemplateMail(to, subject, template, context) {
        try {
            await this.mailerService.sendMail({ to, subject, template, context });
        }
        catch (error) {
            this.logger.error(`Gửi mail thất bại (to=${to}, template=${template}): ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    sendNewAccountEmail(to, data) {
        return this.sendTemplateMail(to, 'Tài khoản của bạn đã được tạo', 'new-account', {
            email: data.email,
            password: data.password,
            full_name: data.full_name ?? undefined,
        });
    }
    sendPasswordResetOtpEmail(to, data) {
        return this.sendTemplateMail(to, 'Mã xác nhận đặt lại mật khẩu', 'password-reset-otp', {
            code: data.code,
            expiresInMinutes: data.expiresInMinutes,
            full_name: data.full_name ?? undefined,
        });
    }
    sendPasswordChangedEmail(to, data) {
        return this.sendTemplateMail(to, 'Mật khẩu của bạn đã được thay đổi', 'password-changed', { full_name: data.full_name ?? undefined });
    }
    sendAccountUpdatedEmail(to, data) {
        return this.sendTemplateMail(to, 'Thông tin tài khoản của bạn đã được cập nhật', 'account-updated', {
            changes: data.changes,
            full_name: data.full_name ?? undefined,
            temporaryPassword: data.temporaryPassword ?? undefined,
        });
    }
    sendTaskAssignedEmail(to, data) {
        return this.sendTemplateMail(to, 'Bạn được giao một công việc mới', 'task-assigned', {
            taskTitle: data.taskTitle,
            assignerName: data.assignerName,
            priority: data.priority,
            dueDate: data.dueDate ?? undefined,
            full_name: data.full_name ?? undefined,
        });
    }
    sendProjectMemberAddedEmail(to, data) {
        return this.sendTemplateMail(to, 'Bạn được thêm vào một dự án', 'project-member-added', {
            projectName: data.projectName,
            projectCode: data.projectCode,
            projectRole: data.projectRole,
            inviterName: data.inviterName,
            full_name: data.full_name ?? undefined,
        });
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mailer_1.MailerService])
], MailService);
//# sourceMappingURL=mail.service.js.map