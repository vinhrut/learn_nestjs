import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ApproveExtensionDto {
  @IsUUID()
  request_id: string;
}

export class RejectExtensionDto {
  @IsUUID()
  request_id: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
