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
  COMMANDS_VIEW: 'commands.view',
  COMMANDS_MANAGE: 'commands.manage',
  QUADRANTS_VIEW: 'quadrants.view',
  QUADRANTS_MANAGE: 'quadrants.manage',
  PATROL_VIEW: 'patrol.view',
  PATROL_MANAGE: 'patrol.manage',
  DETAINEES_VIEW: 'detainees.view',
  DETAINEES_MANAGE: 'detainees.manage',
  SHIFTS_VIEW: 'shifts.view',
  SHIFTS_MANAGE: 'shifts.manage',
  LOGISTICS_VIEW: 'logistics.view',
  LOGISTICS_MANAGE: 'logistics.manage',
  ARMORY_VIEW: 'armory.view',
  ARMORY_MANAGE: 'armory.manage',
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
  [SITOP_PERMISSIONS.COMMANDS_VIEW]: 'Comandos y divisiones',
  [SITOP_PERMISSIONS.COMMANDS_MANAGE]: 'Gestionar comandos',
  [SITOP_PERMISSIONS.QUADRANTS_VIEW]: 'Cuadrantes de paz',
  [SITOP_PERMISSIONS.QUADRANTS_MANAGE]: 'Gestionar cuadrantes',
  [SITOP_PERMISSIONS.PATROL_VIEW]: 'Patrullaje y minutas',
  [SITOP_PERMISSIONS.PATROL_MANAGE]: 'Registrar patrullajes',
  [SITOP_PERMISSIONS.DETAINEES_VIEW]: 'Detenidos / calabozos',
  [SITOP_PERMISSIONS.DETAINEES_MANAGE]: 'Gestionar detenidos',
  [SITOP_PERMISSIONS.SHIFTS_VIEW]: 'Guardias activas',
  [SITOP_PERMISSIONS.SHIFTS_MANAGE]: 'Programar guardias',
  [SITOP_PERMISSIONS.LOGISTICS_VIEW]: 'Logística e inventario',
  [SITOP_PERMISSIONS.LOGISTICS_MANAGE]: 'Gestionar inventario',
  [SITOP_PERMISSIONS.ARMORY_VIEW]: 'Parque de armas',
  [SITOP_PERMISSIONS.ARMORY_MANAGE]: 'Asignar armas',
};

export function hasPermission(
  permissions: string[] | undefined,
  required: SitopPermission | SitopPermission[],
): boolean {
  if (!permissions?.length) return false;
  const list = Array.isArray(required) ? required : [required];
  return list.some((permission) => permissions.includes(permission));
}
