import { Module } from '@nestjs/common';

import { TerminusModule } from '@nestjs/terminus';

import { IncidentsModule } from '../incidents/incidents.module';

import { HealthController } from './health.controller';



@Module({

  imports: [TerminusModule, IncidentsModule],

  controllers: [HealthController],

})

export class HealthModule {}


