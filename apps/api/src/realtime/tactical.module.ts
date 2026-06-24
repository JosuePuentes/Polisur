import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TacticalGateway } from './tactical.gateway';

@Global()
@Module({
  imports: [AuthModule],
  providers: [TacticalGateway],
  exports: [TacticalGateway],
})
export class TacticalModule {}
