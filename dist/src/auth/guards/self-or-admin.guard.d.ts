import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class SelfOrAdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
