import { Module } from '@nestjs/common';
import { IncidentsModule } from '../incidents/incidents.module';
import { RrhhController } from './rrhh.controller';
import { RrhhService } from './rrhh.service';
import { OfficerStorageService } from './services/officer-storage.service';

@Module({
  imports: [IncidentsModule],
  controllers: [RrhhController],
  providers: [RrhhService, OfficerStorageService],
  exports: [RrhhService],
})
export class RrhhModule {}
