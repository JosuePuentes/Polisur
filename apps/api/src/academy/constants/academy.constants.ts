/** Código del departamento Academia / Mando General (seed: DECT). */
export const ACADEMY_DEPARTMENT_CODE = 'DECT';

export const DEFAULT_DISCENTE_PASSWORD =
  process.env.ACADEMY_DEFAULT_PASSWORD ?? 'Polisur2026*';

export const BCRYPT_ROUNDS = 12;

export const GRADUATED_OFFICER_SELECT = {
  id: true,
  cedula: true,
  nombres: true,
  apellidos: true,
  rangeRole: true,
  credentialNumber: true,
  departmentId: true,
  squadId: true,
  promocionId: true,
  telefono: true,
  direccion: true,
  tipoSangre: true,
  alturaCm: true,
  pesoKg: true,
  colorPiel: true,
  contextura: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const DISCENTE_LIST_SELECT = {
  id: true,
  cedula: true,
  nombres: true,
  apellidos: true,
  telefono: true,
  direccion: true,
  tipoSangre: true,
  alturaCm: true,
  pesoKg: true,
  colorPiel: true,
  contextura: true,
  _count: { select: { discenteDocuments: true } },
} as const;

export const BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export const BODY_BUILDS = ['Delgada', 'Promedio', 'Atlética', 'Robusta'] as const;

export const SKIN_COLORS = [
  'Blanca',
  'Morena clara',
  'Morena',
  'Negra',
  'Indígena',
  'Otra',
] as const;
