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
