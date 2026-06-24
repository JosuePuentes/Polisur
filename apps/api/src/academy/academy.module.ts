import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AcademyController } from './academy.controller';
import { AcademyService } from './academy.service';
import { AcademyAccessGuard } from './guards/academy-access.guard';

/**
 * PrismaService se inyecta desde DatabaseModule (@Global).
 */
@Module({
  imports: [AuthModule],
  controllers: [AcademyController],
  providers: [AcademyService, AcademyAccessGuard],
  exports: [AcademyService],
})
export class AcademyModule {}
