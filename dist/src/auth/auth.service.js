"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const otp_service_1 = require("../otp/otp.service");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    prisma;
    usersService;
    jwtService;
    configService;
    otpService;
    mailService;
    constructor(prisma, usersService, jwtService, configService, otpService, mailService) {
        this.prisma = prisma;
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.otpService = otpService;
        this.mailService = mailService;
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user || user.deleted_at || user.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('Email hoặc mật khẩu không đúng');
        }
        const passwordMatches = await bcrypt.compare(dto.password, user.password_hash);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('Email hoặc mật khẩu không đúng');
        }
        const tokens = await this.issueTokens(user.id, user.email, user.username, this.usersService.toRoleCodes(user));
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
    async refreshTokens(refreshToken) {
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
            throw new common_1.UnauthorizedException('Refresh token không hợp lệ');
        }
        const user = await this.usersService.findById(payload.sub);
        if (!user || user.deleted_at || user.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('Refresh token không hợp lệ');
        }
        await this.prisma.refresh_tokens.update({
            where: { id: stored.id },
            data: { revoked_at: new Date() },
        });
        return this.issueTokens(user.id, user.email, user.username, this.usersService.toRoleCodes(user));
    }
    async logout(userId, refreshToken) {
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
    async forgotPassword(email) {
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
    async resetPassword(email, code, newPassword, confirmNewPassword) {
        if (newPassword !== confirmNewPassword) {
            throw new common_1.BadRequestException('Xác nhận mật khẩu không khớp');
        }
        const user = await this.usersService.findByEmail(email);
        if (!user || user.deleted_at || user.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
        }
        await this.otpService.verifyAndConsume(user.id, 'PASSWORD_RESET', code);
        await this.usersService.changePassword(user.id, newPassword);
        void this.mailService.sendPasswordChangedEmail(user.email, {
            full_name: user.full_name ?? undefined,
        });
    }
    async changePassword(userId, currentPassword, newPassword, confirmNewPassword) {
        if (newPassword !== confirmNewPassword) {
            throw new common_1.BadRequestException('Xác nhận mật khẩu không khớp');
        }
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('Phiên đăng nhập không hợp lệ');
        }
        const matches = await bcrypt.compare(currentPassword, user.password_hash);
        if (!matches) {
            throw new common_1.BadRequestException('Mật khẩu hiện tại không đúng');
        }
        if (currentPassword === newPassword) {
            throw new common_1.BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
        }
        await this.usersService.changePassword(userId, newPassword);
        void this.mailService.sendPasswordChangedEmail(user.email, {
            full_name: user.full_name ?? undefined,
        });
    }
    async issueTokens(userId, email, username, roles) {
        const accessPayload = { sub: userId, email, username, roles };
        const accessToken = this.jwtService.sign(accessPayload, {
            secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
            expiresIn: this.configService.getOrThrow('JWT_ACCESS_EXPIRES_IN'),
        });
        const refreshExpiresIn = this.configService.getOrThrow('JWT_REFRESH_EXPIRES_IN');
        const refreshPayload = {
            sub: userId,
            jti: (0, crypto_1.randomUUID)(),
        };
        const refreshToken = this.jwtService.sign(refreshPayload, {
            secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
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
    verifyRefreshToken(refreshToken) {
        try {
            return this.jwtService.verify(refreshToken, {
                secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Refresh token không hợp lệ');
        }
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    addDuration(from, duration) {
        const match = /^(\d+)([smhd])$/.exec(duration);
        if (!match) {
            throw new Error(`Invalid duration format: ${duration}`);
        }
        const value = Number(match[1]);
        const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]];
        return new Date(from.getTime() + value * unitMs);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        otp_service_1.OtpService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map