import { IsOptional, IsString, IsEnum } from 'class-validator';
import { task_status, approval_status } from '@prisma/client';

export class QueryTaskDto {
  @IsOptional()
  @IsString()
  project_id?: string;

  @IsOptional()
  @IsString()
  assignee_id?: string;

  @IsOptional()
  @IsEnum(task_status)
  status?: task_status;

  @IsOptional()
  @IsEnum(approval_status)
  approval_status?: approval_status;

  @IsOptional()
  @IsString()
  search?: string;
}
