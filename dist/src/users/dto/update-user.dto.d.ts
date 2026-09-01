import { role_code, user_status } from '@prisma/client';
export declare const ADMIN_ONLY_FIELDS: readonly ["username", "email", "status", "roleCodes"];
export declare class UpdateUserDto {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    password?: string;
    username?: string;
    email?: string;
    status?: user_status;
    roleCodes?: role_code[];
}
