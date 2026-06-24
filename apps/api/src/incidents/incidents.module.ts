import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { EvidenceStorageService } from './services/evidence-storage.service';
import { ImageProcessorService } from './services/image-processor.service';

/**
 * PrismaService y EvidenceValidationService se inyectan desde DatabaseModule (@Global).
 */
@Module({
  imports: [AuthModule],
  controllers: [IncidentsController],
  providers: [
    IncidentsService,
    ImageProcessorService,
    EvidenceStorageService,
  ],
  exports: [IncidentsService],
})
export class IncidentsModule {}
