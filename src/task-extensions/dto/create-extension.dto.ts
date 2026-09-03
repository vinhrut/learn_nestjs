import {
  IsDateString,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateExtensionDto {
  @IsUUID()
  task_id: string;

  @IsDateString()
  requested_due_date: string;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason: string;
}
