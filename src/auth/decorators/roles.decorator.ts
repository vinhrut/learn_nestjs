import { SetMetadata } from '@nestjs/common';
import { role_code } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: role_code[]) => SetMetadata(ROLES_KEY, roles);
