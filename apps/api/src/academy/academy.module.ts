import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { AcademyController } from './academy.controller';
import { AcademyService } from './academy.service';
import { AcademyAccessGuard } from './guards/academy-access.guard';
import { DiscenteStorageService } from './services/discente-storage.service';

/**
 * PrismaService se inyecta desde DatabaseModule (@Global).
 */
@Module({
  imports: [AuthModule, IncidentsModule],
  controllers: [AcademyController],
  providers: [AcademyService, AcademyAccessGuard, DiscenteStorageService],
  exports: [AcademyService],
})
export class AcademyModule {}
