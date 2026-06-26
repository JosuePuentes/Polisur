import type { SitopPermission } from '@/lib/permissions';

export interface DepartmentCatalog {
  id: string;
  code: string;
  name: string;
  squads: Array<{ id: string; name: string; callsign: string | null }>;
}

export interface RrhhCatalogs {
  departments: DepartmentCatalog[];
  promociones: Array<{ id: string; nombreCurso: string }>;
  permissionCatalog: SitopPermission[];
}

export interface OfficerRecord {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  rangeRole: string;
  credentialNumber: string;
  telefono: string | null;
  email: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  grado: string | null;
  fechaIngreso: string | null;
  permissions: string[];
  effectivePermissions: string[];
  hasCredentials: boolean;
  isSuspended: boolean;
  departmentId: string;
  squadId: string | null;
  promocionId: string | null;
  department: { id: string; code: string; name: string };
  squad: { id: string; name: string; callsign: string | null } | null;
}

export interface CreateOfficerPayload {
  cedula: string;
  nombres: string;
  apellidos: string;
  rangeRole: string;
  credentialNumber: string;
  departmentId: string;
  squadId?: string;
  promocionId?: string;
  telefono?: string;
  email?: string;
  fechaNacimiento?: string;
  direccion?: string;
  grado?: string;
  fechaIngreso?: string;
  password?: string;
  permissions: SitopPermission[];
}
