import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: { id: number };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('No user found in request');
    }

    if (!user.roles || !Array.isArray(user.roles)) {
      throw new UnauthorizedException('User roles not found in request');
    }

    const userHasPermission = requiredRoles.some((role) =>
      user.roles.includes(role),
    );

    if (!userHasPermission) {
      throw new UnauthorizedException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
