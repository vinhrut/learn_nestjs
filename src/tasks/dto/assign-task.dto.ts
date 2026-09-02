import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { task_priority } from '@prisma/client';

/** Payload Leader dùng để tạo + giao thẳng một task cho một user. */
export class AssignTaskDto {
  @IsUUID()
  projectId: string;

  @IsUUID()
  assigneeId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(task_priority)
  priority?: task_priority;

  /** ISO date string, ví dụ "2026-09-15T00:00:00.000Z". */
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
