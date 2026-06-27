import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SITOP_PERMISSIONS } from '@polisur/database';
import { AuditController } from '../audit/decorators/audit-controller.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { ActivateOfficerAccountDto } from './dto/activate-officer-account.dto';
import { AssignOfficerCommandDto } from './dto/assign-officer-command.dto';
import { CreateOfficerDto } from './dto/create-officer.dto';
import { CreateOfficerProfileDto } from './dto/create-officer-profile.dto';
import { CreateSquadDto } from './dto/create-squad.dto';
import { SetOfficerCredentialsDto } from './dto/set-officer-credentials.dto';
import { UpdateOfficerDto } from './dto/update-officer.dto';
import { UpdateOfficerPermissionsDto } from './dto/update-officer-permissions.dto';
import { OfficerPhotoInterceptor } from './interceptors/officer-photo.interceptor';
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
  getCatalogs(@GetUser() actor: AuthenticatedOfficer) {
    return this.rrhhService.getCatalogs(actor);
  }

  @Post('departments')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  @ApiOperation({ summary: 'Crear departamento / comando local' })
  createDepartment(
    @GetUser() actor: AuthenticatedOfficer,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.rrhhService.createDepartment(actor, dto);
  }

  @Post('squads')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  @ApiOperation({ summary: 'Crear escuadra táctica' })
  createSquad(
    @GetUser() actor: AuthenticatedOfficer,
    @Body() dto: CreateSquadDto,
  ) {
    return this.rrhhService.createSquad(actor, dto);
  }

  @Get('officers')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_VIEW)
  @ApiOperation({ summary: 'Buscar funcionarios por cédula, nombre o credencial' })
  searchOfficers(
    @GetUser() actor: AuthenticatedOfficer,
    @Query('q') query?: string,
  ): Promise<OfficerListItem[]> {
    return this.rrhhService.searchOfficers(actor, query);
  }

  @Get('officers/:id')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_VIEW)
  findOfficer(
    @GetUser() actor: AuthenticatedOfficer,
    @Param('id') id: string,
  ): Promise<OfficerListItem> {
    return this.rrhhService.findOfficer(actor, id);
  }

  @Post('officers/profile')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  @UseInterceptors(OfficerPhotoInterceptor())
  createOfficerProfile(
    @GetUser() actor: AuthenticatedOfficer,
    @Body() dto: CreateOfficerProfileDto,
    @Req() request: { file?: Express.Multer.File },
  ): Promise<OfficerListItem> {
    return this.rrhhService.createOfficerProfile(actor, dto, request.file);
  }

  @Get('officers/photos/:filename')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_VIEW)
  async streamOfficerPhoto(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.rrhhService.streamOfficerPhoto(filename, res);
  }

  @Post('officers')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  createOfficer(
    @GetUser() actor: AuthenticatedOfficer,
    @Body() dto: CreateOfficerDto,
  ): Promise<OfficerListItem> {
    return this.rrhhService.createOfficer(actor, dto);
  }

  @Patch('officers/:id')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  updateOfficer(
    @GetUser() actor: AuthenticatedOfficer,
    @Param('id') id: string,
    @Body() dto: UpdateOfficerDto,
  ): Promise<OfficerListItem> {
    return this.rrhhService.updateOfficer(actor, id, dto);
  }

  @Patch('officers/:id/credentials')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_CREDENTIALS)
  setCredentials(
    @GetUser() actor: AuthenticatedOfficer,
    @Param('id') id: string,
    @Body() dto: SetOfficerCredentialsDto,
  ): Promise<OfficerListItem> {
    return this.rrhhService.setCredentials(actor, id, dto);
  }

  @Patch('squads/:id/leader')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  setSquadLeader(
    @GetUser() actor: AuthenticatedOfficer,
    @Param('id') id: string,
    @Body() body: { leaderId: string | null },
  ) {
    return this.rrhhService.setSquadLeader(actor, id, body.leaderId ?? null);
  }

  @Get('graduates/pending')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_VIEW)
  @ApiOperation({ summary: 'Egresados pendientes de asignación operativa' })
  listPendingGraduates(
    @GetUser() actor: AuthenticatedOfficer,
  ): Promise<OfficerListItem[]> {
    return this.rrhhService.listPendingGraduates(actor);
  }

  @Patch('officers/:id/assign')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  assignToCommand(
    @GetUser() actor: AuthenticatedOfficer,
    @Param('id') id: string,
    @Body() dto: AssignOfficerCommandDto,
  ): Promise<OfficerListItem> {
    return this.rrhhService.assignToCommand(actor, id, dto);
  }

  @Patch('officers/:id/activate')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_CREDENTIALS)
  activateAccount(
    @GetUser() actor: AuthenticatedOfficer,
    @Param('id') id: string,
    @Body() dto: ActivateOfficerAccountDto,
  ): Promise<OfficerListItem> {
    return this.rrhhService.activateAccount(actor, id, dto);
  }

  @Patch('officers/:id/transfer')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  transferOfficer(
    @GetUser() actor: AuthenticatedOfficer,
    @Param('id') id: string,
    @Body() body: { departmentId: string; squadId?: string | null },
  ): Promise<OfficerListItem> {
    return this.rrhhService.transferOfficer(actor, id, body);
  }

  @Patch('officers/:id/permissions')
  @RequirePermissions(SITOP_PERMISSIONS.RRHH_MANAGE)
  updatePermissions(
    @GetUser() actor: AuthenticatedOfficer,
    @Param('id') id: string,
    @Body() dto: UpdateOfficerPermissionsDto,
  ): Promise<OfficerListItem> {
    return this.rrhhService.updatePermissions(actor, id, dto);
  }
}
