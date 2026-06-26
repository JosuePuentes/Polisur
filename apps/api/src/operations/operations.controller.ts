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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AssetType,
  DetaineeStatus,
  PatrolType,
  SITOP_PERMISSIONS,
} from '@polisur/database';
import { AuditController } from '../audit/decorators/audit-controller.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { OperationsService } from './operations.service';

@ApiTags('Operaciones')
@ApiBearerAuth('JWT')
@AuditController()
@Controller('operations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('commands')
  @RequirePermissions(SITOP_PERMISSIONS.COMMANDS_VIEW)
  listCommands(@GetUser() actor: AuthenticatedOfficer): Promise<unknown[]> {
    return this.operations.listCommands(actor);
  }

  @Patch('commands/:id')
  @RequirePermissions(SITOP_PERMISSIONS.COMMANDS_MANAGE)
  updateCommand(
    @Param('id') id: string,
    @GetUser() actor: AuthenticatedOfficer,
    @Body() body: Record<string, unknown>,
  ): Promise<unknown> {
    return this.operations.updateCommand(id, body as Parameters<OperationsService['updateCommand']>[1], actor);
  }

  @Post('control-points')
  @RequirePermissions(SITOP_PERMISSIONS.COMMANDS_MANAGE)
  createControlPoint(
    @GetUser() actor: AuthenticatedOfficer,
    @Body() body: Parameters<OperationsService['createControlPoint']>[0],
  ): Promise<unknown> {
    return this.operations.createControlPoint(body, actor);
  }

  @Get('quadrants')
  @RequirePermissions(SITOP_PERMISSIONS.QUADRANTS_VIEW)
  listQuadrants(): Promise<unknown[]> {
    return this.operations.listQuadrants();
  }

  @Post('quadrants')
  @RequirePermissions(SITOP_PERMISSIONS.QUADRANTS_MANAGE)
  createQuadrant(@Body() body: Parameters<OperationsService['createQuadrant']>[0]): Promise<unknown> {
    return this.operations.createQuadrant(body);
  }

  @Get('patrols')
  @RequirePermissions(SITOP_PERMISSIONS.PATROL_VIEW)
  listPatrols(
    @GetUser() actor: AuthenticatedOfficer,
    @Query('departmentId') departmentId?: string,
  ): Promise<unknown[]> {
    return this.operations.listPatrols(actor, departmentId);
  }

  @Post('patrols')
  @RequirePermissions(SITOP_PERMISSIONS.PATROL_MANAGE)
  createPatrol(
    @GetUser() actor: AuthenticatedOfficer,
    @Body()
    body: {
      patrolType: PatrolType;
      parroquia: string;
      cuadrante: string;
      descripcion: string;
      departmentId: string;
      squadId?: string;
      latitude?: number;
      longitude?: number;
      officerIds: string[];
      leaderOfficerId?: string;
    },
  ): Promise<unknown> {
    return this.operations.createPatrol(actor, body);
  }

  @Post('patrols/:id/recovered-objects')
  @RequirePermissions(SITOP_PERMISSIONS.PATROL_MANAGE)
  addRecoveredObject(
    @Param('id') id: string,
    @GetUser() actor: AuthenticatedOfficer,
    @Body() body: { description: string; quantity?: number; unit?: string; photoUrl?: string },
  ): Promise<unknown> {
    return this.operations.addRecoveredObject(id, body, actor);
  }

  @Get('heatmap')
  @RequirePermissions(SITOP_PERMISSIONS.PATROL_VIEW)
  heatmap(@GetUser() actor: AuthenticatedOfficer): Promise<{ patrols: unknown[]; incidents: unknown[] }> {
    return this.operations.heatmapData(actor);
  }

  @Get('detainees')
  @RequirePermissions(SITOP_PERMISSIONS.DETAINEES_VIEW)
  listDetainees(@Query('status') status?: DetaineeStatus): Promise<unknown[]> {
    return this.operations.listDetainees(status);
  }

  @Get('detainees/:id')
  @RequirePermissions(SITOP_PERMISSIONS.DETAINEES_VIEW)
  getDetainee(@Param('id') id: string): Promise<unknown> {
    return this.operations.getDetainee(id);
  }

  @Post('detainees')
  @RequirePermissions(SITOP_PERMISSIONS.DETAINEES_MANAGE)
  createDetainee(@Body() body: Parameters<OperationsService['createDetainee']>[0]): Promise<unknown> {
    return this.operations.createDetainee(body);
  }

  @Post('detainees/:id/hearings')
  @RequirePermissions(SITOP_PERMISSIONS.DETAINEES_MANAGE)
  addHearing(@Param('id') id: string, @Body() body: Parameters<OperationsService['addDetaineeHearing']>[1]): Promise<unknown> {
    return this.operations.addDetaineeHearing(id, body);
  }

  @Post('detainees/:id/records')
  @RequirePermissions(SITOP_PERMISSIONS.DETAINEES_MANAGE)
  addRecord(@Param('id') id: string, @Body() body: Parameters<OperationsService['addDetaineeRecord']>[1]): Promise<unknown> {
    return this.operations.addDetaineeRecord(id, body);
  }

  @Patch('detainees/:id/status')
  @RequirePermissions(SITOP_PERMISSIONS.DETAINEES_MANAGE)
  updateDetaineeStatus(
    @Param('id') id: string,
    @Body() body: { status: DetaineeStatus },
  ): Promise<unknown> {
    return this.operations.updateDetaineeStatus(id, body.status);
  }

  @Get('shifts')
  @RequirePermissions(SITOP_PERMISSIONS.SHIFTS_VIEW)
  listShifts(
    @GetUser() actor: AuthenticatedOfficer,
    @Query('fecha') fecha?: string,
    @Query('departmentId') departmentId?: string,
  ): Promise<unknown[]> {
    return this.operations.listShifts(actor, fecha, departmentId);
  }

  @Get('shifts/roster')
  @RequirePermissions(SITOP_PERMISSIONS.SHIFTS_VIEW)
  activeRoster(
    @GetUser() actor: AuthenticatedOfficer,
    @Query('departmentId') departmentId?: string,
  ): Promise<unknown[]> {
    return this.operations.activeRoster(actor, departmentId);
  }

  @Post('shifts')
  @RequirePermissions(SITOP_PERMISSIONS.SHIFTS_MANAGE)
  createShift(
    @GetUser() actor: AuthenticatedOfficer,
    @Body() body: Parameters<OperationsService['createShift']>[0],
  ): Promise<unknown> {
    return this.operations.createShift(body, actor);
  }

  @Post('shifts/:id/check-in')
  @RequirePermissions(SITOP_PERMISSIONS.SHIFTS_MANAGE)
  checkIn(
    @Param('id') id: string,
    @GetUser() actor: AuthenticatedOfficer,
    @Body() body?: { latitude?: number; longitude?: number },
  ): Promise<unknown> {
    return this.operations.checkInShift(id, actor.id, body);
  }

  @Get('inventory')
  @RequirePermissions(SITOP_PERMISSIONS.LOGISTICS_VIEW)
  listInventory(
    @GetUser() actor: AuthenticatedOfficer,
    @Query('departmentId') departmentId?: string,
    @Query('turno') turno?: string,
  ): Promise<unknown[]> {
    return this.operations.listInventory(actor, departmentId, turno);
  }

  @Get('inventory/by-shift')
  @RequirePermissions(SITOP_PERMISSIONS.LOGISTICS_VIEW)
  inventoryByShift(
    @GetUser() actor: AuthenticatedOfficer,
    @Query('departmentId') departmentId: string,
    @Query('fecha') fecha?: string,
  ): Promise<unknown> {
    return this.operations.inventoryByShift(actor, departmentId, fecha);
  }

  @Get('inventory/summary')
  @RequirePermissions(SITOP_PERMISSIONS.LOGISTICS_VIEW)
  inventorySummary(
    @GetUser() actor: AuthenticatedOfficer,
    @Query('departmentId') departmentId?: string,
  ): Promise<unknown[]> {
    return this.operations.inventorySummary(actor, departmentId);
  }

  @Post('inventory')
  @RequirePermissions(SITOP_PERMISSIONS.LOGISTICS_MANAGE)
  createAsset(
    @GetUser() actor: AuthenticatedOfficer,
    @Body()
    body: {
      code: string;
      name: string;
      assetType: AssetType;
      serialNumber?: string;
      departmentId?: string;
      notas?: string;
    },
  ): Promise<unknown> {
    return this.operations.createAsset(body, actor);
  }

  @Post('inventory/:id/assign')
  @RequirePermissions(SITOP_PERMISSIONS.LOGISTICS_MANAGE)
  assignInventory(
    @Param('id') id: string,
    @GetUser() actor: AuthenticatedOfficer,
    @Body() body: { officerId: string; turno: string },
  ): Promise<unknown> {
    return this.operations.assignInventoryAsset(id, body, actor);
  }

  @Post('inventory/:id/release')
  @RequirePermissions(SITOP_PERMISSIONS.LOGISTICS_MANAGE)
  releaseInventory(
    @Param('id') id: string,
    @GetUser() actor: AuthenticatedOfficer,
  ): Promise<unknown> {
    return this.operations.releaseInventoryAsset(id, actor);
  }

  @Get('shifts/mine')
  @RequirePermissions(SITOP_PERMISSIONS.SHIFTS_VIEW)
  myShift(
    @GetUser() actor: AuthenticatedOfficer,
    @Query('fecha') fecha?: string,
  ): Promise<unknown> {
    return this.operations.getMyShiftToday(actor.id, fecha);
  }

  @Get('weapons')
  @RequirePermissions(SITOP_PERMISSIONS.ARMORY_VIEW)
  listWeapons(
    @GetUser() actor: AuthenticatedOfficer,
    @Query('departmentId') departmentId?: string,
  ): Promise<unknown[]> {
    return this.operations.listWeapons(actor, departmentId);
  }

  @Post('weapons')
  @RequirePermissions(SITOP_PERMISSIONS.ARMORY_MANAGE)
  createWeapon(
    @GetUser() actor: AuthenticatedOfficer,
    @Body() body: Parameters<OperationsService['createWeapon']>[0],
  ): Promise<unknown> {
    return this.operations.createWeapon(body, actor);
  }

  @Post('weapons/:id/assign')
  @RequirePermissions(SITOP_PERMISSIONS.ARMORY_MANAGE)
  assignWeapon(
    @Param('id') id: string,
    @GetUser() actor: AuthenticatedOfficer,
    @Body() body: { officerId: string; turno?: string; observaciones?: string },
  ): Promise<unknown> {
    return this.operations.assignWeapon(id, actor, body);
  }

  @Post('weapons/assignments/:id/return')
  @RequirePermissions(SITOP_PERMISSIONS.ARMORY_MANAGE)
  returnWeapon(
    @Param('id') id: string,
    @GetUser() actor: AuthenticatedOfficer,
  ): Promise<{ ok: boolean }> {
    return this.operations.returnWeapon(id, actor);
  }

  @Get('weapons/:id/history')
  @RequirePermissions(SITOP_PERMISSIONS.ARMORY_VIEW)
  weaponHistory(
    @Param('id') id: string,
    @GetUser() actor: AuthenticatedOfficer,
  ): Promise<unknown[]> {
    return this.operations.weaponAssignmentHistory(id, actor);
  }
}
