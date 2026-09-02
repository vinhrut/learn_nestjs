import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
export class CreateComment {
    @IsString()
    @IsNotEmpty()
    task_id!: string;

    @IsUUID()
    @IsNotEmpty()
    user_id!: string;

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
    @IsString()
    @IsNotEmpty()
    task_id!: string;

    @IsString()
    @IsNotEmpty()
    uploaded_by!: string;
}