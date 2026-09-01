import { role_code } from '@prisma/client';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: role_code[]) => import("@nestjs/common").CustomDecorator<string>;
