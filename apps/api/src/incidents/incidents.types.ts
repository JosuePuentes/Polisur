import type { IncidentEvidence, Prisma } from '@polisur/database';
import { INCIDENT_LIST_INCLUDE } from './incidents.constants';

export type IncidentWithRelations = Prisma.IncidentGetPayload<{
  include: typeof INCIDENT_LIST_INCLUDE;
}>;

export type { IncidentEvidence };
