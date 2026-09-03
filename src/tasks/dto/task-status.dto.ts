import { IsEnum } from 'class-validator';
import { task_status } from '@prisma/client';

export class UpdateTaskStatusDto {
  @IsEnum(task_status)
  status: task_status;
}
