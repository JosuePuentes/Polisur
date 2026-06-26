import { RangeRole } from '@polisur/database';

export interface AuthenticatedOfficer {
  id: string;
  rangeRole: RangeRole;
  departmentId: string;
  squadId?: string | null;
  permissions: string[];
}
