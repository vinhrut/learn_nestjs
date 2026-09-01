import { project_status } from '@prisma/client';
export declare class UpdateProjectDto {
    name?: string;
    description?: string;
    status?: project_status;
}
