import { ConfigService } from '@nestjs/config';
import { otp_purpose } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class OtpService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService);
    private num;
    private get ttlMinutes();
    private get maxAttempts();
    private get resendCooldownSeconds();
    private get codeLength();
    issue(userId: string, purpose: otp_purpose): Promise<{
        code: string;
        expiresInMinutes: number;
    } | null>;
    verifyAndConsume(userId: string, purpose: otp_purpose, code: string): Promise<void>;
    private generateCode;
}
