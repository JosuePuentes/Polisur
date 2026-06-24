import { Module } from '@nestjs/common';
import { ImageProcessorService } from '../incidents/services/image-processor.service';
import { EvidenceStorageService } from '../incidents/services/evidence-storage.service';
import { PublicIncidentsController } from './public-incidents.controller';
import { PublicIncidentsService } from './public-incidents.service';

@Module({
  controllers: [PublicIncidentsController],
  providers: [
    PublicIncidentsService,
    ImageProcessorService,
    EvidenceStorageService,
  ],
})
export class PublicIncidentsModule {}
