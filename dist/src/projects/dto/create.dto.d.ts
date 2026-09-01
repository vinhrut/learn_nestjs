import { project_status } from '@prisma/client';
export declare class CreateProjectDto {
    name: string;
    code: string;
    description?: string;
    status?: project_status;
    member_ids?: string[];
}
