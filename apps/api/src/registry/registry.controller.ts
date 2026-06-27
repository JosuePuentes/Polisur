import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SITOP_PERMISSIONS } from '@polisur/database';
import { AuditController } from '../audit/decorators/audit-controller.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { RegistryService } from './registry.service';

@ApiTags('Registro unificado')
@ApiBearerAuth('JWT')
@AuditController()
@Controller('registry')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RegistryController {
  constructor(private readonly registry: RegistryService) {}

  @Get('search')
  @RequirePermissions(
    SITOP_PERMISSIONS.PATROL_VIEW,
    SITOP_PERMISSIONS.DETAINEES_VIEW,
    SITOP_PERMISSIONS.ACADEMY_DISCENTES,
    SITOP_PERMISSIONS.INCIDENTS_VIEW,
  )
  search(
    @GetUser() actor: AuthenticatedOfficer,
    @Query('q') q: string,
  ): Promise<{ query: string; hits: unknown[] }> {
    return this.registry.search(actor, q ?? '');
  }
}
