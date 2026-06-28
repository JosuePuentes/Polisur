import { Module } from '@nestjs/common';
import { IncidentsModule } from '../incidents/incidents.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { DetaineeStorageService } from './services/detainee-storage.service';
import { PatrolMinuteStorageService } from './services/patrol-minute-storage.service';

@Module({
  imports: [IncidentsModule],
  controllers: [OperationsController],
  providers: [OperationsService, DetaineeStorageService, PatrolMinuteStorageService],
  exports: [OperationsService, DetaineeStorageService, PatrolMinuteStorageService, IncidentsModule],
})
export class OperationsModule {}
