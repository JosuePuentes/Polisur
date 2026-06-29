import { Module } from '@nestjs/common';
import { DemoDataController } from './demo-data.controller';
import { DemoDataService } from './demo-data.service';

@Module({
  controllers: [DemoDataController],
  providers: [DemoDataService],
})
export class DemoDataModule {}
