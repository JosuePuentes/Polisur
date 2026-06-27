import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SITOP_PERMISSIONS } from '@polisur/database';
import { AuditController } from '../audit/decorators/audit-controller.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { AnalyticsService } from './analytics.service';

@ApiTags('Indicadores')
@ApiBearerAuth('JWT')
@AuditController()
@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  @RequirePermissions(SITOP_PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Panel ejecutivo con indicadores operativos en tiempo real' })
  getOverview(
    @GetUser() actor: AuthenticatedOfficer,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.analytics.getOverview(actor, departmentId);
  }
}
