import type { attachments } from '@prisma/client';

export interface IAttachmentRepository {
    create(data: {
        task_id: string;
        uploaded_by: string;
        file_url: string;
        file_name: string;
        mime_type?: string;
        size_bytes?: bigint;
    }): Promise<attachments>;
    deleteAttach(id:string):Promise<string>
}

export const ATTACHMENT_REPOSITORY = 'ATTACHMENT_REPOSITORY';