import { Injectable, Logger } from '@nestjs/common';
import {
  AuditActionKind,
  AuditSeverity,
  Prisma,
  PrismaService,
} from '@polisur/database';
import { CriticalActionEntry, HttpAuditEntry } from './audit.types';

type AuditLogInsert = Prisma.AuditLogCreateInput;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra en segundo plano una traza HTTP sin bloquear la respuesta al cliente.
   */
  scheduleHttpAudit(entry: HttpAuditEntry): void {
    this.schedulePersist(this.buildHttpInsert(entry));
  }

  /**
   * Registra manualmente eventos de alto impacto fuera del ciclo HTTP estándar.
   */
  logCriticalAction(entry: CriticalActionEntry): void {
    const insert: AuditLogInsert = {
      traceId: crypto.randomUUID(),
      actionKind: AuditActionKind.CRITICAL_ACTION,
      severity: entry.severity ?? AuditSeverity.CRITICAL,
      actionLabel: entry.actionLabel,
      clientIp: entry.clientIp ?? 'system',
      httpMethod: 'INTERNAL',
      endpointUrl: `critical://${entry.actionLabel}`,
      statusCode: 200,
      success: true,
      durationMs: null,
      metadata: entry.metadata
        ? (entry.metadata as Prisma.InputJsonValue)
        : undefined,
      officer: {
        connect: { id: entry.officerId },
      },
      rangeRole: entry.rangeRole,
    };

    this.schedulePersist(insert);
  }

  private buildHttpInsert(entry: HttpAuditEntry): AuditLogInsert {
    const base: AuditLogInsert = {
      traceId: entry.traceId,
      actionKind: AuditActionKind.HTTP_REQUEST,
      severity: entry.success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      clientIp: entry.clientIp,
      httpMethod: entry.httpMethod.toUpperCase(),
      endpointUrl: entry.endpointUrl.slice(0, 512),
      routeParams: entry.routeParams
        ? (entry.routeParams as Prisma.InputJsonValue)
        : undefined,
      queryParams: entry.queryParams
        ? (entry.queryParams as Prisma.InputJsonValue)
        : undefined,
      requestBody: entry.requestBody
        ? (entry.requestBody as Prisma.InputJsonValue)
        : undefined,
      statusCode: entry.statusCode,
      success: entry.success,
      durationMs: entry.durationMs,
      errorMessage: entry.errorMessage?.slice(0, 500) ?? undefined,
      rangeRole: entry.rangeRole ?? undefined,
    };

    if (entry.officerId) {
      return {
        ...base,
        officer: { connect: { id: entry.officerId } },
      };
    }

    return base;
  }

  private schedulePersist(insert: AuditLogInsert): void {
    setImmediate(() => {
      void this.persist(insert).catch((error: unknown) => {
        this.logger.error(
          `Fallo al persistir traza de auditoría [traceId=${insert.traceId}]`,
          error instanceof Error ? error.stack : String(error),
        );
        this.emitForensicConsoleFallback(insert, error);
      });
    });
  }

  private async persist(insert: AuditLogInsert): Promise<void> {
    await this.prisma.auditLog.create({ data: insert });
  }

  private emitForensicConsoleFallback(
    insert: AuditLogInsert,
    error: unknown,
  ): void {
    const forensicRecord = {
      ts: new Date().toISOString(),
      level: 'FORENSIC_FALLBACK',
      traceId: insert.traceId,
      actionKind: insert.actionKind,
      severity: insert.severity,
      actionLabel: insert.actionLabel ?? null,
      officerId:
        insert.officer && 'connect' in insert.officer
          ? insert.officer.connect?.id
          : null,
      rangeRole: insert.rangeRole ?? null,
      clientIp: insert.clientIp,
      httpMethod: insert.httpMethod,
      endpointUrl: insert.endpointUrl,
      routeParams: insert.routeParams ?? null,
      queryParams: insert.queryParams ?? null,
      requestBody: insert.requestBody ?? null,
      statusCode: insert.statusCode,
      success: insert.success,
      durationMs: insert.durationMs ?? null,
      metadata: insert.metadata ?? null,
      errorMessage: insert.errorMessage ?? null,
      persistError:
        error instanceof Error ? error.message : 'Error de persistencia desconocido',
    };

    this.logger.warn(JSON.stringify(forensicRecord));
  }
}
