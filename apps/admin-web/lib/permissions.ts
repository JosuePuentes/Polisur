export const SITOP_PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  INCIDENTS_VIEW: 'incidents.view',
  INCIDENTS_CREATE: 'incidents.create',
  INCIDENTS_STATUS: 'incidents.status',
  INCIDENTS_EVIDENCE: 'incidents.evidence',
  ACADEMY_VIEW: 'academy.view',
  ACADEMY_PROMOCIONES: 'academy.promociones',
  ACADEMY_DISCENTES: 'academy.discentes',
  RRHH_VIEW: 'rrhh.view',
  RRHH_MANAGE: 'rrhh.manage',
  RRHH_CREDENTIALS: 'rrhh.credentials',
} as const;

export type SitopPermission =
  (typeof SITOP_PERMISSIONS)[keyof typeof SITOP_PERMISSIONS];

export const PERMISSION_LABELS: Record<SitopPermission, string> = {
  [SITOP_PERMISSIONS.DASHBOARD_VIEW]: 'Centro de Mando',
  [SITOP_PERMISSIONS.INCIDENTS_VIEW]: 'Ver incidentes y denuncias',
  [SITOP_PERMISSIONS.INCIDENTS_CREATE]: 'Crear minutas y patrullajes',
  [SITOP_PERMISSIONS.INCIDENTS_STATUS]: 'Cambiar estatus de casos',
  [SITOP_PERMISSIONS.INCIDENTS_EVIDENCE]: 'Subir evidencias',
  [SITOP_PERMISSIONS.ACADEMY_VIEW]: 'Ver Academia',
  [SITOP_PERMISSIONS.ACADEMY_PROMOCIONES]: 'Gestionar promociones',
  [SITOP_PERMISSIONS.ACADEMY_DISCENTES]: 'Inscribir aspirantes',
  [SITOP_PERMISSIONS.RRHH_VIEW]: 'Consultar RRHH',
  [SITOP_PERMISSIONS.RRHH_MANAGE]: 'Registrar funcionarios',
  [SITOP_PERMISSIONS.RRHH_CREDENTIALS]: 'Asignar claves de acceso',
};

export function hasPermission(
  permissions: string[] | undefined,
  required: SitopPermission | SitopPermission[],
): boolean {
  if (!permissions?.length) return false;
  const list = Array.isArray(required) ? required : [required];
  return list.some((permission) => permissions.includes(permission));
}

export function hasAnyPermission(
  permissions: string[] | undefined,
  required: SitopPermission[],
): boolean {
  return required.some((permission) => hasPermission(permissions, permission));
}
