import { SetMetadata } from '@nestjs/common';
import { SitopPermission } from '@polisur/database';

export const PERMISSIONS_KEY = 'sitop_permissions';

export const RequirePermissions = (...permissions: SitopPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
