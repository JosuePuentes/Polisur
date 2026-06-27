import { RangeRole } from '@prisma/client';

export const SITOP_PERMISSIONS = {
  ANALYTICS_VIEW: 'analytics.view',
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
  PROCEDURES_VIEW: 'procedures.view',
  PROCEDURES_MANAGE: 'procedures.manage',
  DETAINEES_VIEW: 'detainees.view',
  DETAINEES_MANAGE: 'detainees.manage',
  SHIFTS_VIEW: 'shifts.view',
  SHIFTS_MANAGE: 'shifts.manage',
  LOGISTICS_VIEW: 'logistics.view',
  LOGISTICS_MANAGE: 'logistics.manage',
  ARMORY_VIEW: 'armory.view',
  ARMORY_MANAGE: 'armory.manage',
  AUDIT_VIEW: 'audit.view',
} as const;

export type SitopPermission =
  (typeof SITOP_PERMISSIONS)[keyof typeof SITOP_PERMISSIONS];

export const ALL_SITOP_PERMISSIONS: SitopPermission[] = Object.values(
  SITOP_PERMISSIONS,
);

export const SITOP_PERMISSION_LABELS: Record<SitopPermission, string> = {
  [SITOP_PERMISSIONS.ANALYTICS_VIEW]: 'Panel ejecutivo e indicadores',
  [SITOP_PERMISSIONS.DASHBOARD_VIEW]: 'Centro de Mando',
  [SITOP_PERMISSIONS.INCIDENTS_VIEW]: 'Ver incidentes y denuncias',
  [SITOP_PERMISSIONS.INCIDENTS_CREATE]: 'Crear minutas y patrullajes',
  [SITOP_PERMISSIONS.INCIDENTS_STATUS]: 'Cambiar estatus de casos',
  [SITOP_PERMISSIONS.INCIDENTS_EVIDENCE]: 'Subir evidencias fotográficas',
  [SITOP_PERMISSIONS.ACADEMY_VIEW]: 'Ver Academia DECT',
  [SITOP_PERMISSIONS.ACADEMY_PROMOCIONES]: 'Gestionar promociones',
  [SITOP_PERMISSIONS.ACADEMY_DISCENTES]: 'Inscribir aspirantes',
  [SITOP_PERMISSIONS.RRHH_VIEW]: 'Consultar funcionarios',
  [SITOP_PERMISSIONS.RRHH_MANAGE]: 'Registrar y editar funcionarios',
  [SITOP_PERMISSIONS.RRHH_CREDENTIALS]: 'Asignar claves de acceso',
  [SITOP_PERMISSIONS.COMMANDS_VIEW]: 'Ver comandos y divisiones',
  [SITOP_PERMISSIONS.COMMANDS_MANAGE]: 'Gestionar comandos y puntos de control',
  [SITOP_PERMISSIONS.QUADRANTS_VIEW]: 'Ver cuadrantes de paz',
  [SITOP_PERMISSIONS.QUADRANTS_MANAGE]: 'Gestionar cuadrantes de paz',
  [SITOP_PERMISSIONS.PATROL_VIEW]: 'Ver patrullajes y minutas',
  [SITOP_PERMISSIONS.PATROL_MANAGE]: 'Registrar patrullajes y objetos recuperados',
  [SITOP_PERMISSIONS.PROCEDURES_VIEW]: 'Ver procedimientos en curso',
  [SITOP_PERMISSIONS.PROCEDURES_MANAGE]: 'Registrar llegada y cerrar procedimientos',
  [SITOP_PERMISSIONS.DETAINEES_VIEW]: 'Ver detenidos y calabozos',
  [SITOP_PERMISSIONS.DETAINEES_MANAGE]: 'Registrar detenidos y audiencias',
  [SITOP_PERMISSIONS.SHIFTS_VIEW]: 'Ver guardias y funcionarios activos',
  [SITOP_PERMISSIONS.SHIFTS_MANAGE]: 'Programar guardias y marcar llegada',
  [SITOP_PERMISSIONS.LOGISTICS_VIEW]: 'Ver logística e inventario',
  [SITOP_PERMISSIONS.LOGISTICS_MANAGE]: 'Gestionar patrullas, motos y equipos',
  [SITOP_PERMISSIONS.ARMORY_VIEW]: 'Ver parque de armas',
  [SITOP_PERMISSIONS.ARMORY_MANAGE]: 'Asignar y registrar armas',
  [SITOP_PERMISSIONS.AUDIT_VIEW]: 'Consultar auditoría forense',
};

const JEFE_PERMISSIONS: SitopPermission[] = [
  SITOP_PERMISSIONS.ANALYTICS_VIEW,
  SITOP_PERMISSIONS.DASHBOARD_VIEW,
  SITOP_PERMISSIONS.INCIDENTS_VIEW,
  SITOP_PERMISSIONS.INCIDENTS_CREATE,
  SITOP_PERMISSIONS.INCIDENTS_STATUS,
  SITOP_PERMISSIONS.INCIDENTS_EVIDENCE,
  SITOP_PERMISSIONS.ACADEMY_VIEW,
  SITOP_PERMISSIONS.ACADEMY_PROMOCIONES,
  SITOP_PERMISSIONS.ACADEMY_DISCENTES,
  SITOP_PERMISSIONS.RRHH_VIEW,
  SITOP_PERMISSIONS.RRHH_MANAGE,
  SITOP_PERMISSIONS.RRHH_CREDENTIALS,
  SITOP_PERMISSIONS.COMMANDS_VIEW,
  SITOP_PERMISSIONS.COMMANDS_MANAGE,
  SITOP_PERMISSIONS.QUADRANTS_VIEW,
  SITOP_PERMISSIONS.PATROL_VIEW,
  SITOP_PERMISSIONS.PATROL_MANAGE,
  SITOP_PERMISSIONS.PROCEDURES_VIEW,
  SITOP_PERMISSIONS.PROCEDURES_MANAGE,
  SITOP_PERMISSIONS.DETAINEES_VIEW,
  SITOP_PERMISSIONS.DETAINEES_MANAGE,
  SITOP_PERMISSIONS.SHIFTS_VIEW,
  SITOP_PERMISSIONS.SHIFTS_MANAGE,
  SITOP_PERMISSIONS.LOGISTICS_VIEW,
  SITOP_PERMISSIONS.LOGISTICS_MANAGE,
  SITOP_PERMISSIONS.ARMORY_VIEW,
  SITOP_PERMISSIONS.ARMORY_MANAGE,
];

const OFICIAL_PERMISSIONS: SitopPermission[] = [
  SITOP_PERMISSIONS.DASHBOARD_VIEW,
  SITOP_PERMISSIONS.INCIDENTS_VIEW,
  SITOP_PERMISSIONS.INCIDENTS_CREATE,
  SITOP_PERMISSIONS.INCIDENTS_STATUS,
  SITOP_PERMISSIONS.INCIDENTS_EVIDENCE,
  SITOP_PERMISSIONS.PATROL_VIEW,
  SITOP_PERMISSIONS.PATROL_MANAGE,
  SITOP_PERMISSIONS.PROCEDURES_VIEW,
  SITOP_PERMISSIONS.PROCEDURES_MANAGE,
  SITOP_PERMISSIONS.DETAINEES_VIEW,
  SITOP_PERMISSIONS.SHIFTS_VIEW,
];

export const ROLE_DEFAULT_PERMISSIONS: Record<RangeRole, SitopPermission[]> = {
  [RangeRole.SUPER_ADMIN]: ALL_SITOP_PERMISSIONS,
  [RangeRole.JEFE_DEPARTAMENTO]: JEFE_PERMISSIONS,
  [RangeRole.OFICIAL_ACTIVO]: OFICIAL_PERMISSIONS,
  [RangeRole.DISCENTE]: [],
};

export function resolveOfficerPermissions(input: {
  rangeRole: RangeRole;
  permissions: string[];
}): SitopPermission[] {
  if (input.rangeRole === RangeRole.SUPER_ADMIN) {
    return ALL_SITOP_PERMISSIONS;
  }

  if (input.permissions.length > 0) {
    return input.permissions.filter((permission): permission is SitopPermission =>
      ALL_SITOP_PERMISSIONS.includes(permission as SitopPermission),
    );
  }

  return ROLE_DEFAULT_PERMISSIONS[input.rangeRole];
}

export function officerHasPermission(
  input: { rangeRole: RangeRole; permissions: string[] },
  required: SitopPermission | SitopPermission[],
): boolean {
  const effective = resolveOfficerPermissions(input);
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.every((permission) => effective.includes(permission));
}
