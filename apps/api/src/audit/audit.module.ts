import { Global, Module } from '@nestjs/common';
import { AuditInterceptor } from './audit.interceptor';
import { AuditQueryController } from './audit-query.controller';
import { AuditService } from './audit.service';

@Global()
@Module({
  controllers: [AuditQueryController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
