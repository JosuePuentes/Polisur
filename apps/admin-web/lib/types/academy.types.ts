export interface AcademyDepartment {
  id: string;
  name: string;
  code: string;
}

export interface PromocionDiscente {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  direccion: string | null;
  tipoSangre: string | null;
  alturaCm: number | null;
  pesoKg: number | null;
  colorPiel: string | null;
  contextura: string | null;
  _count: { discenteDocuments: number };
}

export interface Promocion {
  id: string;
  nombreCurso: string;
  fechaInicio: string;
  fechaFinEstimada: string;
  createdAt: string;
  updatedAt: string;
  discentes: PromocionDiscente[];
  totalDiscentes: number;
}

export interface RegisterDiscentePayload {
  cedula: string;
  nombres: string;
  apellidos: string;
  departmentId: string;
  promocionId: string;
  direccion?: string;
  telefono?: string;
  tipoSangre?: string;
  alturaCm?: number;
  pesoKg?: number;
  colorPiel?: string;
  contextura?: string;
}

export interface DiscenteDocument {
  id: string;
  filename: string;
  originalName: string | null;
  mimeType: string;
  label: string | null;
  sortOrder: number;
  url: string;
}

export interface RegisteredDiscente {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  rangeRole: string;
  departmentId: string;
  promocionId: string | null;
  telefono: string | null;
  direccion: string | null;
  tipoSangre: string | null;
  alturaCm: number | null;
  pesoKg: number | null;
  colorPiel: string | null;
  contextura: string | null;
  discenteDocuments?: DiscenteDocument[];
}

export interface GraduatePromocionResult {
  promocionId: string;
  nombreCurso: string;
  totalGraduados: number;
  egresados: RegisteredDiscente[];
}

export interface ApiErrorBody {
  message?: string | string[];
  statusCode?: number;
}
