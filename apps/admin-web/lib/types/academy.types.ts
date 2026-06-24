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
}

export interface RegisteredDiscente {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  rangeRole: string;
  departmentId: string;
  promocionId: string | null;
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
