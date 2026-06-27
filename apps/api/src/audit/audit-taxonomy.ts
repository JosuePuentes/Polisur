export const AUDIT_MODULES = {
  RRHH: 'RRHH',
  LOGISTICS: 'LOGISTICS',
  ARMORY: 'ARMORY',
  PATROL: 'PATROL',
  INCIDENTS: 'INCIDENTS',
  DETAINEES: 'DETAINEES',
  SHIFTS: 'SHIFTS',
  COMMANDS: 'COMMANDS',
  ACADEMY: 'ACADEMY',
  AUTH: 'AUTH',
  PUBLIC: 'PUBLIC',
  CRITICAL: 'CRITICAL',
} as const;

export type AuditModule = (typeof AUDIT_MODULES)[keyof typeof AUDIT_MODULES];

export const AUDIT_MODULE_LABELS: Record<AuditModule, string> = {
  RRHH: 'Recursos Humanos',
  LOGISTICS: 'Logística',
  ARMORY: 'Parque de armas',
  PATROL: 'Patrullaje y minutas',
  INCIDENTS: 'Incidentes y denuncias',
  DETAINEES: 'Detenidos',
  SHIFTS: 'Guardias y turnos',
  COMMANDS: 'Comandos y cuadrantes',
  ACADEMY: 'Academia',
  AUTH: 'Acceso al sistema',
  PUBLIC: 'Denuncias públicas',
  CRITICAL: 'Eventos críticos',
};

export const CRITICAL_ACTION_LABELS = {
  INCIDENT_STATUS_PROCESADO: 'INCIDENT_STATUS_PROCESADO',
  ACADEMY_MASS_GRADUATION: 'ACADEMY_MASS_GRADUATION',
} as const;

export type CriticalActionLabel =
  (typeof CRITICAL_ACTION_LABELS)[keyof typeof CRITICAL_ACTION_LABELS];

export const CRITICAL_ACTION_DISPLAY: Record<CriticalActionLabel, string> = {
  INCIDENT_STATUS_PROCESADO: 'Incidente marcado como procesado',
  ACADEMY_MASS_GRADUATION: 'Graduación masiva de promoción',
};

type HttpMethod = string;

export interface AuditDescriptor {
  module: AuditModule;
  action: string;
  actionLabel: string;
}

interface AuditRule {
  methods?: HttpMethod[];
  pattern: RegExp;
  module: AuditModule;
  action: string;
  label: string;
}

/** Rutas más específicas primero. */
const HTTP_AUDIT_RULES: AuditRule[] = [
  // RRHH
  {
    methods: ['PATCH'],
    pattern: /^\/rrhh\/officers\/[^/]+\/transfer$/,
    module: AUDIT_MODULES.RRHH,
    action: 'OFFICER_TRANSFER',
    label: 'Transferencia de funcionario',
  },
  {
    methods: ['PATCH'],
    pattern: /^\/rrhh\/officers\/[^/]+\/assign$/,
    module: AUDIT_MODULES.RRHH,
    action: 'OFFICER_ASSIGN',
    label: 'Asignación a comando o división',
  },
  {
    methods: ['PATCH'],
    pattern: /^\/rrhh\/officers\/[^/]+\/activate$/,
    module: AUDIT_MODULES.RRHH,
    action: 'OFFICER_ACTIVATE',
    label: 'Activación de usuario',
  },
  {
    methods: ['PATCH'],
    pattern: /^\/rrhh\/officers\/[^/]+\/permissions$/,
    module: AUDIT_MODULES.RRHH,
    action: 'OFFICER_PERMISSIONS',
    label: 'Actualización de permisos',
  },
  {
    methods: ['PATCH'],
    pattern: /^\/rrhh\/officers\/[^/]+\/credentials$/,
    module: AUDIT_MODULES.RRHH,
    action: 'OFFICER_CREDENTIALS',
    label: 'Asignación de credenciales',
  },
  {
    methods: ['POST'],
    pattern: /^\/rrhh\/officers\/profile$/,
    module: AUDIT_MODULES.RRHH,
    action: 'OFFICER_PROFILE_CREATE',
    label: 'Creación de perfil de funcionario',
  },
  {
    methods: ['POST'],
    pattern: /^\/rrhh\/officers$/,
    module: AUDIT_MODULES.RRHH,
    action: 'OFFICER_CREATE',
    label: 'Registro de funcionario',
  },
  {
    methods: ['PATCH'],
    pattern: /^\/rrhh\/officers\/[^/]+$/,
    module: AUDIT_MODULES.RRHH,
    action: 'OFFICER_UPDATE',
    label: 'Actualización de datos del funcionario',
  },
  {
    methods: ['PATCH'],
    pattern: /^\/rrhh\/squads\/[^/]+\/leader$/,
    module: AUDIT_MODULES.RRHH,
    action: 'SQUAD_LEADER',
    label: 'Asignación de líder de escuadra',
  },
  {
    methods: ['POST'],
    pattern: /^\/rrhh\/(departments|squads)$/,
    module: AUDIT_MODULES.RRHH,
    action: 'RRHH_STRUCTURE',
    label: 'Alta de estructura RRHH',
  },
  {
    pattern: /^\/rrhh\//,
    module: AUDIT_MODULES.RRHH,
    action: 'RRHH_QUERY',
    label: 'Consulta RRHH',
  },

  // Logística
  {
    methods: ['POST'],
    pattern: /^\/operations\/inventory\/[^/]+\/assign$/,
    module: AUDIT_MODULES.LOGISTICS,
    action: 'ASSET_ASSIGN',
    label: 'Asignación de activo logístico',
  },
  {
    methods: ['POST'],
    pattern: /^\/operations\/inventory\/[^/]+\/release$/,
    module: AUDIT_MODULES.LOGISTICS,
    action: 'ASSET_RELEASE',
    label: 'Devolución de activo logístico',
  },
  {
    methods: ['POST'],
    pattern: /^\/operations\/inventory$/,
    module: AUDIT_MODULES.LOGISTICS,
    action: 'ASSET_CREATE',
    label: 'Alta de activo logístico',
  },
  {
    pattern: /^\/operations\/inventory/,
    module: AUDIT_MODULES.LOGISTICS,
    action: 'LOGISTICS_QUERY',
    label: 'Consulta de logística',
  },

  // Parque de armas
  {
    methods: ['POST'],
    pattern: /^\/operations\/weapons\/[^/]+\/assign$/,
    module: AUDIT_MODULES.ARMORY,
    action: 'WEAPON_ASSIGN',
    label: 'Asignación de arma',
  },
  {
    methods: ['POST'],
    pattern: /^\/operations\/weapons\/assignments\/[^/]+\/return$/,
    module: AUDIT_MODULES.ARMORY,
    action: 'WEAPON_RETURN',
    label: 'Devolución de arma',
  },
  {
    methods: ['POST'],
    pattern: /^\/operations\/weapons$/,
    module: AUDIT_MODULES.ARMORY,
    action: 'WEAPON_CREATE',
    label: 'Alta de arma',
  },
  {
    pattern: /^\/operations\/weapons/,
    module: AUDIT_MODULES.ARMORY,
    action: 'ARMORY_QUERY',
    label: 'Consulta de parque de armas',
  },

  // Patrullaje / minutas
  {
    methods: ['POST'],
    pattern: /^\/operations\/patrols\/[^/]+\/recovered-objects$/,
    module: AUDIT_MODULES.PATROL,
    action: 'PATROL_RECOVERED_OBJECT',
    label: 'Objeto recuperado en minuta',
  },
  {
    methods: ['POST'],
    pattern: /^\/operations\/patrols$/,
    module: AUDIT_MODULES.PATROL,
    action: 'PATROL_CREATE',
    label: 'Registro de minuta / patrullaje',
  },
  {
    pattern: /^\/operations\/patrols/,
    module: AUDIT_MODULES.PATROL,
    action: 'PATROL_QUERY',
    label: 'Consulta de patrullajes',
  },

  // Guardias
  {
    methods: ['POST'],
    pattern: /^\/operations\/shifts\/[^/]+\/check-in$/,
    module: AUDIT_MODULES.SHIFTS,
    action: 'SHIFT_CHECK_IN',
    label: 'Check-in de guardia',
  },
  {
    methods: ['POST'],
    pattern: /^\/operations\/shifts$/,
    module: AUDIT_MODULES.SHIFTS,
    action: 'SHIFT_CREATE',
    label: 'Creación de guardia / turno',
  },
  {
    pattern: /^\/operations\/shifts/,
    module: AUDIT_MODULES.SHIFTS,
    action: 'SHIFT_QUERY',
    label: 'Consulta de guardias',
  },

  // Detenidos
  {
    methods: ['POST'],
    pattern: /^\/operations\/detainees\/[^/]+\/records$/,
    module: AUDIT_MODULES.DETAINEES,
    action: 'DETAINEE_RECORD',
    label: 'Minuta / registro de detenido',
  },
  {
    methods: ['POST'],
    pattern: /^\/operations\/detainees\/[^/]+\/hearings$/,
    module: AUDIT_MODULES.DETAINEES,
    action: 'DETAINEE_HEARING',
    label: 'Audiencia de detenido',
  },
  {
    methods: ['PATCH'],
    pattern: /^\/operations\/detainees\/[^/]+\/status$/,
    module: AUDIT_MODULES.DETAINEES,
    action: 'DETAINEE_STATUS',
    label: 'Cambio de estado de detenido',
  },
  {
    methods: ['POST'],
    pattern: /^\/operations\/detainees$/,
    module: AUDIT_MODULES.DETAINEES,
    action: 'DETAINEE_CREATE',
    label: 'Ingreso de detenido',
  },
  {
    pattern: /^\/operations\/detainees/,
    module: AUDIT_MODULES.DETAINEES,
    action: 'DETAINEE_QUERY',
    label: 'Consulta de detenidos',
  },

  // Comandos y cuadrantes
  {
    methods: ['POST', 'PATCH'],
    pattern: /^\/operations\/(commands|control-points|quadrants)/,
    module: AUDIT_MODULES.COMMANDS,
    action: 'COMMAND_MANAGE',
    label: 'Gestión de comando o cuadrante',
  },
  {
    pattern: /^\/operations\/(commands|control-points|quadrants)/,
    module: AUDIT_MODULES.COMMANDS,
    action: 'COMMAND_QUERY',
    label: 'Consulta de comandos o cuadrantes',
  },

  // Incidentes
  {
    methods: ['POST'],
    pattern: /^\/incidents\/radio-dispatch$/,
    module: AUDIT_MODULES.INCIDENTS,
    action: 'INCIDENT_RADIO',
    label: 'Despacho por radio',
  },
  {
    methods: ['PATCH'],
    pattern: /^\/incidents\/[^/]+\/status$/,
    module: AUDIT_MODULES.INCIDENTS,
    action: 'INCIDENT_STATUS',
    label: 'Cambio de estado de incidente',
  },
  {
    methods: ['POST'],
    pattern: /^\/incidents\/[^/]+\/evidence$/,
    module: AUDIT_MODULES.INCIDENTS,
    action: 'INCIDENT_EVIDENCE',
    label: 'Carga de evidencia',
  },
  {
    methods: ['POST'],
    pattern: /^\/incidents$/,
    module: AUDIT_MODULES.INCIDENTS,
    action: 'INCIDENT_CREATE',
    label: 'Registro de incidente o minuta',
  },
  {
    pattern: /^\/incidents/,
    module: AUDIT_MODULES.INCIDENTS,
    action: 'INCIDENT_QUERY',
    label: 'Consulta de incidentes',
  },

  // Academia
  {
    methods: ['POST'],
    pattern: /^\/academy\/promociones\/[^/]+\/graduar$/,
    module: AUDIT_MODULES.ACADEMY,
    action: 'ACADEMY_GRADUATE',
    label: 'Graduación de promoción',
  },
  {
    methods: ['POST'],
    pattern: /^\/academy\/discentes$/,
    module: AUDIT_MODULES.ACADEMY,
    action: 'DISCENTE_REGISTER',
    label: 'Inscripción de discente',
  },
  {
    methods: ['POST', 'PATCH'],
    pattern: /^\/academy\/promociones/,
    module: AUDIT_MODULES.ACADEMY,
    action: 'PROMOCION_MANAGE',
    label: 'Gestión de promoción',
  },
  {
    pattern: /^\/academy/,
    module: AUDIT_MODULES.ACADEMY,
    action: 'ACADEMY_QUERY',
    label: 'Consulta de academia',
  },

  // Auth
  {
    methods: ['POST'],
    pattern: /^\/auth\/login$/,
    module: AUDIT_MODULES.AUTH,
    action: 'LOGIN',
    label: 'Inicio de sesión',
  },

  // Público
  {
    methods: ['POST'],
    pattern: /^\/public\/(denuncias|panico)$/,
    module: AUDIT_MODULES.PUBLIC,
    action: 'PUBLIC_COMPLAINT',
    label: 'Denuncia o alerta pública ciudadana',
  },
];

export const MODULE_ENDPOINT_HINTS: Record<AuditModule, string[]> = {
  RRHH: ['/rrhh/'],
  LOGISTICS: ['/operations/inventory'],
  ARMORY: ['/operations/weapons'],
  PATROL: ['/operations/patrols'],
  INCIDENTS: ['/incidents'],
  DETAINEES: ['/operations/detainees'],
  SHIFTS: ['/operations/shifts'],
  COMMANDS: ['/operations/commands', '/operations/quadrants', '/operations/control-points'],
  ACADEMY: ['/academy/'],
  AUTH: ['/auth/'],
  PUBLIC: ['/public/'],
  CRITICAL: ['critical://'],
};

export function listAuditCatalog() {
  const actionsByModule = new Map<AuditModule, Array<{ action: string; label: string }>>();

  for (const rule of HTTP_AUDIT_RULES) {
    const list = actionsByModule.get(rule.module) ?? [];
    if (!list.some((item) => item.action === rule.action)) {
      list.push({ action: rule.action, label: rule.label });
      actionsByModule.set(rule.module, list);
    }
  }

  for (const [key, label] of Object.entries(CRITICAL_ACTION_DISPLAY)) {
    const list = actionsByModule.get(AUDIT_MODULES.CRITICAL) ?? [];
    list.push({ action: key, label });
    actionsByModule.set(AUDIT_MODULES.CRITICAL, list);
  }

  return {
    modules: Object.values(AUDIT_MODULES).map((id) => ({
      id,
      label: AUDIT_MODULE_LABELS[id],
      actions: actionsByModule.get(id) ?? [],
    })),
  };
}

export function normalizeAuditPath(endpointUrl: string): string {
  const path = endpointUrl.split('?')[0] ?? endpointUrl;
  const normalized = path.replace(/^\/api/, '') || '/';
  if (normalized.startsWith('critical://')) {
    return normalized;
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function resolveHttpAuditDescriptor(
  httpMethod: string,
  endpointUrl: string,
): AuditDescriptor | null {
  const path = normalizeAuditPath(endpointUrl);
  const method = httpMethod.toUpperCase();

  for (const rule of HTTP_AUDIT_RULES) {
    if (rule.methods && !rule.methods.includes(method)) continue;
    if (!rule.pattern.test(path)) continue;
    return {
      module: rule.module,
      action: rule.action,
      actionLabel: rule.label,
    };
  }

  return null;
}

export function resolveCriticalAuditDescriptor(actionLabel: string): AuditDescriptor {
  const display =
    CRITICAL_ACTION_DISPLAY[actionLabel as CriticalActionLabel] ?? actionLabel;
  return {
    module: AUDIT_MODULES.CRITICAL,
    action: actionLabel,
    actionLabel: display,
  };
}
