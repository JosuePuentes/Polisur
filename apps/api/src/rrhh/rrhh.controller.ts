import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SITOP_PERMISSIONS } from '@polisur/database';
import { AuditController } from '../audit/decorators/audit-controller.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateOfficerDto } from './dto/create-officer.dto';
import { CreateSquadDto } from './dto/create-squad.dto';
import { SetOfficerCredentialsDto } from './dto/set-officer-credentials.dto';
import { UpdateOfficerDto } from './dto/update-officer.dto';
import { UpdateOfficerPermissionsDto } from './dto/update-officer-permissions.dto';
import { OfficerListItem, RrhhService } from './rrhh.service';

@ApiTags('RRHH')
@ApiBearerAuth('JWT')
@AuditController()
@Controller('rrhh')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RrhhController {
  constructor(private readonly rrhhService: RrhhService) {}

  @Get('catalogs')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_VIEW)
  @ApiOperation({ summary: 'Catálogos de departamentos, escuadras y permisos' })
  getCatalogs() {
    return this.rrhhService.getCatalogs();
  }

  @Post('departments')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  @ApiOperation({ summary: 'Crear departamento / comando local' })
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.rrhhService.createDepartment(dto);
  }

  @Post('squads')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  @ApiOperation({ summary: 'Crear escuadra táctica' })
  createSquad(@Body() dto: CreateSquadDto) {
    return this.rrhhService.createSquad(dto);
  }

  @Get('officers')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_VIEW)
  @ApiOperation({ summary: 'Buscar funcionarios por cédula, nombre o credencial' })
  searchOfficers(@Query('q') query?: string): Promise<OfficerListItem[]> {
    return this.rrhhService.searchOfficers(query);
  }

  @Get('officers/:id')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_VIEW)
  findOfficer(@Param('id') id: string): Promise<OfficerListItem> {
    return this.rrhhService.findOfficer(id);
  }

  @Post('officers')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  createOfficer(@Body() dto: CreateOfficerDto): Promise<OfficerListItem> {
    return this.rrhhService.createOfficer(dto);
  }

  @Patch('officers/:id')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  updateOfficer(
    @Param('id') id: string,
    @Body() dto: UpdateOfficerDto,
  ): Promise<OfficerListItem> {
    return this.rrhhService.updateOfficer(id, dto);
  }

  @Patch('officers/:id/credentials')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_CREDENTIALS)
  setCredentials(
    @Param('id') id: string,
    @Body() dto: SetOfficerCredentialsDto,
  ): Promise<OfficerListItem> {
    return this.rrhhService.setCredentials(id, dto);
  }

  @Patch('squads/:id/leader')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  setSquadLeader(
    @Param('id') id: string,
    @Body() body: { leaderId: string | null },
  ) {
    return this.rrhhService.setSquadLeader(id, body.leaderId ?? null);
  }

  @Get('graduates/pending')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_VIEW)
  @ApiOperation({ summary: 'Egresados pendientes de asignación operativa' })
  listPendingGraduates(): Promise<OfficerListItem[]> {
    return this.rrhhService.listPendingGraduates();
  }

  @Patch('officers/:id/transfer')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  transferOfficer(
    @Param('id') id: string,
    @Body() body: { departmentId: string; squadId?: string | null },
  ): Promise<OfficerListItem> {
    return this.rrhhService.transferOfficer(id, body);
  }

  @Patch('officers/:id/permissions')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateOfficerPermissionsDto,
  ): Promise<OfficerListItem> {
    return this.rrhhService.updatePermissions(id, dto);
  }
}
