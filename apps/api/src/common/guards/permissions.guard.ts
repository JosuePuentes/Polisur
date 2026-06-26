import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SitopPermission } from '@polisur/database';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuthenticatedOfficer } from '../interfaces/authenticated-officer.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<SitopPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedOfficer }>();
    const officer = request.user;

    if (!officer) {
      throw new ForbiddenException('Sesión no válida');
    }

    const allowed = required.some((permission) =>
      officer.permissions.includes(permission),
    );

    if (!allowed) {
      throw new ForbiddenException('No tiene permisos para esta operación');
    }

    return true;
  }
}
