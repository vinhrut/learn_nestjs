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
var OtpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcryptjs"));
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
let OtpService = OtpService_1 = class OtpService {
    prisma;
    config;
    logger = new common_1.Logger(OtpService_1.name);
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    num(key, fallback) {
        const parsed = Number(this.config.get(key));
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }
    get ttlMinutes() {
        return this.num('OTP_TTL_MINUTES', 10);
    }
    get maxAttempts() {
        return this.num('OTP_MAX_ATTEMPTS', 5);
    }
    get resendCooldownSeconds() {
        return this.num('OTP_RESEND_COOLDOWN_SECONDS', 60);
    }
    get codeLength() {
        return this.num('OTP_LENGTH', 6);
    }
    async issue(userId, purpose) {
        const now = new Date();
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
        if (this.config.get('OTP_DEBUG_LOG') === 'true') {
            this.logger.debug(`[DEV] OTP ${purpose} cho user=${userId}: ${code} (hết hạn sau ${expiresInMinutes} phút)`);
        }
        return { code, expiresInMinutes };
    }
    async verifyAndConsume(userId, purpose, code) {
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
            throw new common_1.BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
        }
        if (record.attempts >= this.maxAttempts) {
            await this.prisma.otp_codes.update({
                where: { id: record.id },
                data: { consumed_at: new Date() },
            });
            throw new common_1.BadRequestException('Bạn đã nhập sai quá số lần cho phép, vui lòng yêu cầu mã mới');
        }
        const matches = await bcrypt.compare(code, record.code_hash);
        if (!matches) {
            await this.prisma.otp_codes.update({
                where: { id: record.id },
                data: { attempts: { increment: 1 } },
            });
            throw new common_1.BadRequestException('Mã xác nhận không đúng');
        }
        await this.prisma.otp_codes.update({
            where: { id: record.id },
            data: { consumed_at: new Date() },
        });
    }
    generateCode() {
        const max = 10 ** this.codeLength;
        return (0, crypto_1.randomInt)(0, max).toString().padStart(this.codeLength, '0');
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = OtpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], OtpService);
//# sourceMappingURL=otp.service.js.map