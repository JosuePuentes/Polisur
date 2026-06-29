import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@polisur/database';
import { AnalyticsModule } from './analytics/analytics.module';
import { AcademyModule } from './academy/academy.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { DemoDataModule } from './demo-data/demo-data.module';
import { HealthModule } from './health/health.module';
import { IncidentsModule } from './incidents/incidents.module';
import { ProceduresModule } from './procedures/procedures.module';
import { PublicIncidentsModule } from './public-incidents/public-incidents.module';
import { OperationsModule } from './operations/operations.module';
import { RegistryModule } from './registry/registry.module';
import { RrhhModule } from './rrhh/rrhh.module';
import { TacticalModule } from './realtime/tactical.module';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    AuditModule,
    AnalyticsModule,
    BootstrapModule,
    DemoDataModule,
    HealthModule,
    TacticalModule,
    AuthModule,
    AcademyModule,
    IncidentsModule,
    PublicIncidentsModule,
    RrhhModule,
    OperationsModule,
    ProceduresModule,
    RegistryModule,
  ],
  providers: [PermissionsGuard],
})
export class AppModule {}
