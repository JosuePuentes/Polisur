import { AuditActionKind, AuditSeverity, Prisma } from '@polisur/database';
import {
  AUDIT_MODULES,
  AuditModule,
  MODULE_ENDPOINT_HINTS,
  normalizeAuditPath,
} from '../audit-taxonomy';

export interface AuditLogQueryInput {
  severity?: AuditSeverity;
  officerId?: string;
  success?: boolean;
  module?: AuditModule;
  action?: string;
  httpMethod?: string;
  mutationsOnly?: boolean;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildModuleClause(module: AuditModule): Prisma.AuditLogWhereInput {
  const hints = MODULE_ENDPOINT_HINTS[module] ?? [];
  return {
    OR: [
      { metadata: { path: ['module'], equals: module } },
      ...hints.map((hint) => ({
        endpointUrl: { contains: hint, mode: 'insensitive' as const },
      })),
    ],
  };
}

export function buildAuditLogWhere(input: AuditLogQueryInput): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];

  if (input.severity) {
    and.push({ severity: input.severity });
  }

  if (input.officerId) {
    and.push({ officerId: input.officerId });
  }

  if (input.success !== undefined) {
    and.push({ success: input.success });
  }

  if (input.module) {
    and.push(buildModuleClause(input.module));
  }

  if (input.action) {
    and.push({
      OR: [
        { metadata: { path: ['action'], equals: input.action } },
        { actionLabel: { contains: input.action, mode: 'insensitive' } },
      ],
    });
  }

  if (input.httpMethod) {
    and.push({ httpMethod: input.httpMethod.toUpperCase() });
  }

  if (input.mutationsOnly) {
    and.push({
      httpMethod: { in: ['POST', 'PATCH', 'PUT', 'DELETE', 'INTERNAL'] },
    });
  }

  const trimmedQ = input.q?.trim();
  if (trimmedQ) {
    and.push({
      OR: [
        { actionLabel: { contains: trimmedQ, mode: 'insensitive' } },
        { endpointUrl: { contains: trimmedQ, mode: 'insensitive' } },
        { traceId: { contains: trimmedQ, mode: 'insensitive' } },
        { errorMessage: { contains: trimmedQ, mode: 'insensitive' } },
        {
          officer: {
            OR: [
              { cedula: { contains: trimmedQ } },
              { nombres: { contains: trimmedQ, mode: 'insensitive' } },
              { apellidos: { contains: trimmedQ, mode: 'insensitive' } },
            ],
          },
        },
      ],
    });
  }

  if (input.dateFrom || input.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (input.dateFrom) {
      createdAt.gte = new Date(`${input.dateFrom}T00:00:00.000Z`);
    }
    if (input.dateTo) {
      createdAt.lte = new Date(`${input.dateTo}T23:59:59.999Z`);
    }
    and.push({ createdAt });
  }

  if (and.length === 0) {
    return {};
  }

  return { AND: and };
}

export function isAuditModule(value: string): value is AuditModule {
  return Object.values(AUDIT_MODULES).includes(value as AuditModule);
}

export function normalizeEndpointForDisplay(endpointUrl: string): string {
  return normalizeAuditPath(endpointUrl);
}
