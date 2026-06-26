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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { OperationsService } from './operations.service';

@ApiTags('Operaciones')
@ApiBearerAuth('JWT')
@Controller('operations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('commands')
  @RequirePermissions(SITOP_PERMISSIONS.COMMANDS_VIEW)
  listCommands(): Promise<unknown[]> {
    return this.operations.listCommands();
  }

  @Patch('commands/:id')
  @RequirePermissions(SITOP_PERMISSIONS.COMMANDS_MANAGE)
  updateCommand(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<unknown> {
    return this.operations.updateCommand(id, body as Parameters<OperationsService['updateCommand']>[1]);
  }

  @Post('control-points')
  @RequirePermissions(SITOP_PERMISSIONS.COMMANDS_MANAGE)
  createControlPoint(@Body() body: Parameters<OperationsService['createControlPoint']>[0]): Promise<unknown> {
    return this.operations.createControlPoint(body);
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
  listPatrols(@Query('departmentId') departmentId?: string): Promise<unknown[]> {
    return this.operations.listPatrols(departmentId);
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
    @Body() body: { description: string; quantity?: number; unit?: string; photoUrl?: string },
  ): Promise<unknown> {
    return this.operations.addRecoveredObject(id, body);
  }

  @Get('heatmap')
  @RequirePermissions(SITOP_PERMISSIONS.PATROL_VIEW)
  heatmap(): Promise<{ patrols: unknown[]; incidents: unknown[] }> {
    return this.operations.heatmapData();
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
    @Query('fecha') fecha?: string,
    @Query('departmentId') departmentId?: string,
  ): Promise<unknown[]> {
    return this.operations.listShifts(fecha, departmentId);
  }

  @Get('shifts/roster')
  @RequirePermissions(SITOP_PERMISSIONS.SHIFTS_VIEW)
  activeRoster(@Query('departmentId') departmentId?: string): Promise<unknown[]> {
    return this.operations.activeRoster(departmentId);
  }

  @Post('shifts')
  @RequirePermissions(SITOP_PERMISSIONS.SHIFTS_MANAGE)
  createShift(@Body() body: Parameters<OperationsService['createShift']>[0]): Promise<unknown> {
    return this.operations.createShift(body);
  }

  @Post('shifts/:id/check-in')
  @RequirePermissions(SITOP_PERMISSIONS.SHIFTS_MANAGE)
  checkIn(@Param('id') id: string, @GetUser() actor: AuthenticatedOfficer): Promise<unknown> {
    return this.operations.checkInShift(id, actor.id);
  }

  @Get('inventory')
  @RequirePermissions(SITOP_PERMISSIONS.LOGISTICS_VIEW)
  listInventory(@Query('departmentId') departmentId?: string): Promise<unknown[]> {
    return this.operations.listInventory(departmentId);
  }

  @Get('inventory/summary')
  @RequirePermissions(SITOP_PERMISSIONS.LOGISTICS_VIEW)
  inventorySummary(): Promise<unknown[]> {
    return this.operations.inventorySummary();
  }

  @Post('inventory')
  @RequirePermissions(SITOP_PERMISSIONS.LOGISTICS_MANAGE)
  createAsset(
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
    return this.operations.createAsset(body);
  }

  @Get('weapons')
  @RequirePermissions(SITOP_PERMISSIONS.ARMORY_VIEW)
  listWeapons(@Query('departmentId') departmentId?: string): Promise<unknown[]> {
    return this.operations.listWeapons(departmentId);
  }

  @Post('weapons')
  @RequirePermissions(SITOP_PERMISSIONS.ARMORY_MANAGE)
  createWeapon(@Body() body: Parameters<OperationsService['createWeapon']>[0]): Promise<unknown> {
    return this.operations.createWeapon(body);
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
  returnWeapon(@Param('id') id: string): Promise<{ ok: boolean }> {
    return this.operations.returnWeapon(id);
  }

  @Get('weapons/:id/history')
  @RequirePermissions(SITOP_PERMISSIONS.ARMORY_VIEW)
  weaponHistory(@Param('id') id: string): Promise<unknown[]> {
    return this.operations.weaponAssignmentHistory(id);
  }
}
