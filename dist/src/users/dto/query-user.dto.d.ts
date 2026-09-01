import { user_status } from '@prisma/client';
export declare class QueryUserDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: user_status;
}
