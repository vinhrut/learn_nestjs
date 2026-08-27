import { IsString, IsNotEmpty } from 'class-validator';
export class CreateComment {
    task_id!: string;
    user_id!: string;
    content!: string;
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