import { ForbiddenException } from '@nestjs/common';
import { RangeRole } from '@polisur/database';
import { OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE } from '../../incidents/incidents-access.constants';
import { AuthenticatedOfficer } from '../interfaces/authenticated-officer.interface';

export function assertOperationalActor(actor: AuthenticatedOfficer): void {
  if (actor.rangeRole === RangeRole.DISCENTE) {
    throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);
  }
}

export function resolveScopedDepartmentId(
  actor: AuthenticatedOfficer,
  requestedDepartmentId?: string,
): string | undefined {
  assertOperationalActor(actor);

  if (actor.rangeRole === RangeRole.SUPER_ADMIN) {
    return requestedDepartmentId;
  }

  if (requestedDepartmentId && requestedDepartmentId !== actor.departmentId) {
    throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);
  }

  return actor.departmentId;
}

export function assertDepartmentAccess(
  actor: AuthenticatedOfficer,
  departmentId: string,
): void {
  assertOperationalActor(actor);

  if (actor.rangeRole === RangeRole.SUPER_ADMIN) {
    return;
  }

  if (departmentId !== actor.departmentId) {
    throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);
  }
}

export function assertPatrolCreateScope(
  actor: AuthenticatedOfficer,
  departmentId: string,
  squadId?: string | null,
): void {
  assertOperationalActor(actor);

  if (actor.rangeRole === RangeRole.SUPER_ADMIN) {
    return;
  }

  if (actor.rangeRole === RangeRole.JEFE_DEPARTAMENTO) {
    if (departmentId !== actor.departmentId) {
      throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);
    }
    return;
  }

  if (actor.rangeRole === RangeRole.OFICIAL_ACTIVO) {
    if (
      departmentId !== actor.departmentId ||
      (squadId && actor.squadId && squadId !== actor.squadId)
    ) {
      throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);
    }
    return;
  }

  throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);
}
