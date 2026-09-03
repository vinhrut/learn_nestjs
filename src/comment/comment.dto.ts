import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
export class CreateComment {
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
  @IsString()
  @IsNotEmpty()
  type!: string;
}
export class DeleteCommentDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
export class CreateAttachmentDto {
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsString()
  @IsNotEmpty()
  uploaded_by!: string;
}
