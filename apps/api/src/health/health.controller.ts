import { HealthCheckService, HealthIndicatorResult, PrismaHealthIndicator } from '@nestjs/terminus';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@polisur/database';
import { EvidenceStorageService } from '../incidents/services/evidence-storage.service';

@ApiTags('Salud')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly evidenceStorage: EvidenceStorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Healthcheck de API, PostgreSQL y almacén de evidencias' })
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.checkEvidenceStorage(),
    ]);
  }

  private async checkEvidenceStorage(): Promise<HealthIndicatorResult> {
    const disk = await this.evidenceStorage.getHealth();
    const isProd = process.env.NODE_ENV === 'production';

    return {
      evidence_storage: {
        status: disk.status,
        writable: disk.writable,
        ...(isProd ? {} : { path: disk.path }),
      },
    };
  }
}
