import { AuditSeverity, RangeRole } from '@polisur/database';
import type { CriticalActionLabel } from './audit.constants';

export interface HttpAuditEntry {
  traceId: string;
  officerId?: string | null;
  rangeRole?: RangeRole | null;
  clientIp: string;
  httpMethod: string;
  endpointUrl: string;
  routeParams?: Record<string, unknown> | null;
  queryParams?: Record<string, unknown> | null;
  requestBody?: Record<string, unknown> | null;
  statusCode: number;
  success: boolean;
  durationMs: number;
  errorMessage?: string | null;
}

export interface CriticalActionEntry {
  officerId: string;
  rangeRole: RangeRole;
  clientIp?: string;
  actionLabel: CriticalActionLabel | string;
  metadata?: Record<string, unknown>;
  severity?: AuditSeverity;
}
