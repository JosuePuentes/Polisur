export { DatabaseModule } from './database.module';
export { PrismaService } from './prisma.service';

export * from './dto';
export * from './validation';
export {
  ALL_SITOP_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  SITOP_PERMISSION_LABELS,
  SITOP_PERMISSIONS,
  officerHasPermission,
  resolveOfficerPermissions,
  type SitopPermission,
} from './permissions/sitop-permissions';
export {
  DEFAULT_PEACE_QUADRANTS,
  DEFAULT_PEACE_QUADRANT_NAMES,
  quadrantCodeFromName,
  type DefaultPeaceQuadrantSeed,
} from './constants/default-peace-quadrants';
export {
  DEFAULT_MINUTE_HEADER_LINES,
  DEFAULT_MINUTE_RESEÑA_PREFIX,
  DEFAULT_MINUTE_LEMA,
  DEFAULT_MINUTE_CONCEPTOS,
  DEFAULT_MINUTE_ASUNTOS,
  MAX_MINUTE_PHOTOS,
} from './constants/minute-defaults';
export {
  DEMO_CODE_PREFIX,
  DEMO_CEDULA_PREFIX,
  DEMO_DEFAULT_PASSWORD,
  DEMO_DETAINEES,
  DEMO_OFFICERS,
} from './constants/demo-data.constants';

export {
  AssetStatus,
  AssetType,
  AuditActionKind,
  AuditSeverity,
  DetaineeStatus,
  DetaineePhotoKind,
  DivisionRole,
  EvidenceStage,
  IncidentOrigin,
  IncidentStatus,
  MinuteRole,
  MinuteCatalogKind,
  ProcedureOutcome,
  ProcedureStatus,
  PatrolType,
  Prisma,
  RangeRole,
  ShiftStatus,
  VehicleType,
  WeaponStatus,
} from '@prisma/client';

export type {
  AuditLog,
  Department,
  Incident,
  IncidentEvidence,
  Officer,
  Promocion,
  Squad,
} from '@prisma/client';
