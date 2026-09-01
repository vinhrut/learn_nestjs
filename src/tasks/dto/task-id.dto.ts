import { IsString, IsOptional } from 'class-validator';

export class SubmitTaskDto {
  @IsString()
  task_id: string;
}

export class ApproveTaskDto {
  @IsString()
  task_id: string;
}

export class RejectTaskDto {
  @IsString()
  task_id: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
