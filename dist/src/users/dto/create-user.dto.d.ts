import { role_code } from '@prisma/client';
export declare class CreateUserDto {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    roleCodes?: role_code[];
}
