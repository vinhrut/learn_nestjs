import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { task_priority } from '@prisma/client';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(task_priority)
  priority?: task_priority;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  project_id?: string;

  @IsOptional()
  @IsString()
  assignee_id?: string;
}
