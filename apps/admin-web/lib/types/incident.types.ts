export type IncidentStatus =
  | 'PENDIENTE'
  | 'DESPACHADO'
  | 'EN_TRANSITO'
  | 'PENDIENTE_RESEÑA'
  | 'PROCESADO'
  | 'CERRADO';

export type EvidenceStage = 'RETORNO_CALLE' | 'RESEÑA_COMANDO';

export interface IncidentEvidence {
  id: string;
  imageUrl: string;
  stage: EvidenceStage;
  descripcion: string | null;
  capturedAt: string;
}

export interface IncidentDepartment {
  id: string;
  code: string;
  name: string;
}

export interface IncidentOfficer {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  rangeRole: string;
}

export interface IncidentSquad {
  id: string;
  name: string;
  callsign: string | null;
  leader: IncidentOfficer | null;
  members: IncidentOfficer[];
}

export interface Incident {
  id: string;
  code: string;
  tipoDelito: string;
  status: IncidentStatus;
  parroquia: string;
  cuadrante: string;
  descripcion: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  latitude?: number | null;
  longitude?: number | null;
  origen?: string;
  departmentId: string;
  squadId: string;
  department: IncidentDepartment;
  squad: IncidentSquad;
  evidence: IncidentEvidence[];
}

export interface UploadEvidencePayload {
  incidentId: string;
  stage: EvidenceStage;
  descripcion?: string;
  file: File;
}
