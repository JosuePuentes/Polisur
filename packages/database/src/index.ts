export { DatabaseModule } from './database.module';
export { PrismaService } from './prisma.service';

export * from './dto';
export * from './validation';

export {
  AuditActionKind,
  AuditSeverity,
  EvidenceStage,
  IncidentOrigin,
  IncidentStatus,
  Prisma,
  RangeRole,
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
