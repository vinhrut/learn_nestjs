import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersService } from '../users/users.service';
export declare class AuthController {
    private readonly authService;
    private readonly usersService;
    constructor(authService: AuthService, usersService: UsersService);
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
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(user: {
        id: string;
    }, dto: RefreshTokenDto): Promise<{
        success: boolean;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    changePassword(user: {
        id: string;
    }, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    me(user: {
        id: string;
    }): Promise<{
        id: string;
        username: string;
        email: string;
        full_name: string | null;
        status: import("@prisma/client").$Enums.user_status;
        roles: import("@prisma/client").$Enums.role_code[];
    } | null>;
}
