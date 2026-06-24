import type { IncidentStatus } from '@polisur/database';
import { RangeRole } from '@polisur/database';

export interface TacticalIncidentPayload {
  id: string;
  code: string;
  tipoDelito: string;
  status: IncidentStatus;
  parroquia: string;
  cuadrante: string;
  descripcion: string;
  latitude: number | null;
  longitude: number | null;
  origen: string;
  createdAt: string;
  department: {
    id: string;
    code: string;
    name: string;
  };
  squad: {
    id: string;
    name: string;
    callsign: string | null;
  };
}

export interface PanicAlertPayload extends TacticalIncidentPayload {
  alertType: 'PANIC';
}

export const TACTICAL_EVENTS = {
  INCIDENT_CREATED: 'incident:created',
  PANIC_ALERT: 'panic:alert',
} as const;

export const TACTICAL_WS_AUTHORIZED_ROLES: ReadonlySet<RangeRole> = new Set([
  RangeRole.SUPER_ADMIN,
  RangeRole.JEFE_DEPARTAMENTO,
  RangeRole.OFICIAL_ACTIVO,
]);
