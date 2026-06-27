import { Module } from '@nestjs/common';
import { BootstrapAdminService } from './bootstrap-admin.service';

@Module({
  providers: [BootstrapAdminService],
  exports: [BootstrapAdminService],
})
export class BootstrapModule {}
