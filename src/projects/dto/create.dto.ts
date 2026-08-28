import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { project_status } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(project_status)
  status?: project_status;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  member_ids?: string[];
}
