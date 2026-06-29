import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { DemoDataService } from './demo-data.service';

@ApiTags('Datos demo')
@ApiBearerAuth('JWT')
@Controller('admin/demo')
@UseGuards(JwtAuthGuard)
export class DemoDataController {
  constructor(private readonly demoData: DemoDataService) {}

  @Get('status')
  getStatus(@GetUser() actor: AuthenticatedOfficer): Promise<unknown> {
    return this.demoData.getStatus();
  }

  @Post('seed')
  seed(@GetUser() actor: AuthenticatedOfficer): Promise<unknown> {
    return this.demoData.seedDemoData(actor);
  }

  @Post('clear')
  clear(@GetUser() actor: AuthenticatedOfficer): Promise<unknown> {
    return this.demoData.clearDemoData(actor);
  }
}
