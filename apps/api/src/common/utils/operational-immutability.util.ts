import { BadRequestException } from '@nestjs/common';
import { DetaineeStatus } from '@polisur/database';

export const IMMUTABLE_TACTICAL_RECORD_MESSAGE =
  'Registro histórico inmutable. Las alteraciones en el inventario táctico o actas de custodia requieren autorización del Director General.';

export function assertDetaineeAllowsMutation(status: DetaineeStatus): void {
  if (
    status === DetaineeStatus.LIBERADO ||
    status === DetaineeStatus.TRASLADADO_FISCALIA
  ) {
    throw new BadRequestException(IMMUTABLE_TACTICAL_RECORD_MESSAGE);
  }
}

export function assertWeaponAssignmentAllowsMutation(returnedAt: Date | null): void {
  if (returnedAt) {
    throw new BadRequestException(IMMUTABLE_TACTICAL_RECORD_MESSAGE);
  }
}
