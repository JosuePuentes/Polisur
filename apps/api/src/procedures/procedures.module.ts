import { Module } from '@nestjs/common';
import { IncidentsModule } from '../incidents/incidents.module';
import { OperationsModule } from '../operations/operations.module';
import { ProceduresController } from './procedures.controller';
import { ProceduresService } from './procedures.service';

@Module({
  imports: [OperationsModule, IncidentsModule],
  controllers: [ProceduresController],
  providers: [ProceduresService],
  exports: [ProceduresService],
})
export class ProceduresModule {}
