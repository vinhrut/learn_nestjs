import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { role_code, user_status } from '@prisma/client';

// Fields that require the Administrator role.
export const ADMIN_ONLY_FIELDS = [
  'username',
  'email',
  'status',
  'roleCodes',
] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  // --- Admin-only fields below ---

  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(user_status)
  status?: user_status;

  @IsOptional()
  @IsArray()
  @IsEnum(role_code, { each: true })
  roleCodes?: role_code[];
}
