import { RangeRole } from '@polisur/database';

export interface JwtPayload {
  sub: string;
  rangeRole: RangeRole;
  departmentId: string;
  squadId?: string | null;
}
