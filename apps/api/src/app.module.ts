import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@polisur/database';
import { AcademyModule } from './academy/academy.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { HealthModule } from './health/health.module';
import { IncidentsModule } from './incidents/incidents.module';
import { PublicIncidentsModule } from './public-incidents/public-incidents.module';
import { OperationsModule } from './operations/operations.module';
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
    BootstrapModule,
    HealthModule,
    TacticalModule,
    AuthModule,
    AcademyModule,
    IncidentsModule,
    PublicIncidentsModule,
    RrhhModule,
    OperationsModule,
  ],
  providers: [PermissionsGuard],
})
export class AppModule {}
