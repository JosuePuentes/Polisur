import { API_BASE_URL } from '@/lib/constants';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const TACTICAL_WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? `${API_ORIGIN}/tactical`;

export const TACTICAL_EVENTS = {
  INCIDENT_CREATED: 'incident:created',
  PANIC_ALERT: 'panic:alert',
} as const;

export interface TacticalSocketIncident {
  id: string;
  code: string;
  tipoDelito: string;
  status: string;
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
