import type { TacticalSocketIncident } from '@/lib/constants/tactical-socket';
import type { Incident, IncidentStatus } from '@/lib/types/incident.types';

export function incidentToSocketPayload(incident: Incident): TacticalSocketIncident {
  return {
    id: incident.id,
    code: incident.code,
    tipoDelito: incident.tipoDelito,
    status: incident.status,
    parroquia: incident.parroquia,
    cuadrante: incident.cuadrante,
    descripcion: incident.descripcion,
    latitude: incident.latitude ?? null,
    longitude: incident.longitude ?? null,
    origen: incident.origen ?? 'INTERNO',
    createdAt: incident.createdAt,
    department: incident.department,
    squad: {
      id: incident.squad.id,
      name: incident.squad.name,
      callsign: incident.squad.callsign,
    },
  };
}

export function mapSocketPayloadToIncident(
  payload: TacticalSocketIncident,
  existing?: Incident,
): Incident {
  return {
    id: payload.id,
    code: payload.code,
    tipoDelito: payload.tipoDelito,
    status: payload.status as IncidentStatus,
    parroquia: payload.parroquia,
    cuadrante: payload.cuadrante,
    descripcion: payload.descripcion,
    createdAt: payload.createdAt,
    updatedAt: existing?.updatedAt ?? payload.createdAt,
    closedAt: existing?.closedAt ?? null,
    latitude: payload.latitude,
    longitude: payload.longitude,
    origen: payload.origen,
    departmentId: payload.department.id,
    squadId: payload.squad.id,
    department: payload.department,
    squad: {
      id: payload.squad.id,
      name: payload.squad.name,
      callsign: payload.squad.callsign,
      leader: existing?.squad.leader ?? null,
      members: existing?.squad.members ?? [],
    },
    evidence: existing?.evidence ?? [],
  };
}

export function upsertIncidentFromSocket(
  incidents: Incident[],
  payload: TacticalSocketIncident,
): Incident[] {
  const index = incidents.findIndex((item) => item.id === payload.id);
  if (index >= 0) {
    const next = [...incidents];
    next[index] = mapSocketPayloadToIncident(payload, incidents[index]);
    return next;
  }
  return [mapSocketPayloadToIncident(payload), ...incidents];
}

export function upsertIncident(
  incidents: Incident[],
  incident: Incident,
): Incident[] {
  const index = incidents.findIndex((item) => item.id === incident.id);
  if (index >= 0) {
    const next = [...incidents];
    next[index] = incident;
    return next;
  }
  return [incident, ...incidents];
}
