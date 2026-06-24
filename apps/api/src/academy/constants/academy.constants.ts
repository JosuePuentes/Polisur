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
  createdAt: true,
  updatedAt: true,
} as const;
