import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { role_code } from '@prisma/client';

interface RequestUser {
  id: string;
  roles: string[];
}

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    const targetId = request.params.id;

    const isAdmin = user?.roles?.includes(role_code.ADMIN);
    const isSelf = !!user && user.id === targetId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException(
        'Bạn chỉ có thể thao tác trên tài khoản của chính mình',
      );
    }

    return true;
  }
}
