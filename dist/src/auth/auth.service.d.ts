import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { OtpService } from '../otp/otp.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly usersService;
    private readonly jwtService;
    private readonly configService;
    private readonly otpService;
    private readonly mailService;
    constructor(prisma: PrismaService, usersService: UsersService, jwtService: JwtService, configService: ConfigService, otpService: OtpService, mailService: MailService);
    login(dto: LoginDto): Promise<{
        user: {
            id: string;
            username: string;
            email: string;
            full_name: string | null;
            status: "ACTIVE";
            roles: import("@prisma/client").$Enums.role_code[];
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, refreshToken: string): Promise<{
        success: boolean;
    }>;
    forgotPassword(email: string): Promise<void>;
    resetPassword(email: string, code: string, newPassword: string, confirmNewPassword: string): Promise<void>;
    changePassword(userId: string, currentPassword: string, newPassword: string, confirmNewPassword: string): Promise<void>;
    private issueTokens;
    private verifyRefreshToken;
    private hashToken;
    private addDuration;
}
