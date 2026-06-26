import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditSeverity, PrismaService, SITOP_PERMISSIONS } from '@polisur/database';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@ApiTags('Auditoría')
@ApiBearerAuth('JWT')
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditQueryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('logs')
  @RequirePermissions(SITOP_PERMISSIONS.AUDIT_VIEW)
  @ApiOperation({ summary: 'Consultar trazas de auditoría forense' })
  async listLogs(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('severity') severity?: AuditSeverity,
    @Query('officerId') officerId?: string,
    @Query('success') success?: string,
  ): Promise<{ items: unknown[]; total: number; page: number; limit: number }> {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...(severity ? { severity } : {}),
      ...(officerId ? { officerId } : {}),
      ...(success !== undefined ? { success: success === 'true' } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          traceId: true,
          actionKind: true,
          severity: true,
          actionLabel: true,
          officerId: true,
          rangeRole: true,
          clientIp: true,
          httpMethod: true,
          endpointUrl: true,
          statusCode: true,
          success: true,
          durationMs: true,
          errorMessage: true,
          createdAt: true,
          officer: { select: { nombres: true, apellidos: true, cedula: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page: pageNum, limit: limitNum };
  }
}
