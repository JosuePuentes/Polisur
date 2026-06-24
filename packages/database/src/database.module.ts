import { Global, Module } from '@nestjs/common';
import { EvidenceValidationService } from './validation/evidence-validation.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, EvidenceValidationService],
  exports: [PrismaService, EvidenceValidationService],
})
export class DatabaseModule {}
