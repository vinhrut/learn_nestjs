import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { role_code, user_status } from '@prisma/client';

export type SortOrder = 'asc' | 'desc';

export class QueryUserDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(user_status)
  status?: user_status;

  @IsOptional()
  @IsEnum(role_code)
  role?: role_code;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: SortOrder = 'desc';
}
