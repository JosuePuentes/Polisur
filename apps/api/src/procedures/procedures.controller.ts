import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProcedureOutcome, SITOP_PERMISSIONS, VehicleType } from '@polisur/database';
import { AuditController } from '../audit/decorators/audit-controller.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { DetaineePhotosInterceptor } from '../operations/interceptors/detainee-photos.interceptor';
import { ProceduresService } from './procedures.service';

@ApiTags('Procedimientos')
@ApiBearerAuth('JWT')
@AuditController()
@Controller('procedures')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProceduresController {
  constructor(private readonly procedures: ProceduresService) {}

  @Get()
  @RequirePermissions(SITOP_PERMISSIONS.PROCEDURES_VIEW)
  list(
    @GetUser() actor: AuthenticatedOfficer,
    @Query('scope') scope?: 'active' | 'completed' | 'all',
  ): Promise<unknown[]> {
    return this.procedures.list(actor, scope ?? 'active');
  }

  @Patch('detainees/:detaineeId/admit')
  @RequirePermissions(SITOP_PERMISSIONS.DETAINEES_MANAGE)
  admitTransitDetainee(
    @GetUser() actor: AuthenticatedOfficer,
    @Param('detaineeId') detaineeId: string,
    @Body()
    body: {
      detentionCellId: string;
      delitoInicial: string;
      nombres?: string;
      apellidos?: string;
      cedula?: string;
      alias?: string;
      notas?: string;
    },
  ): Promise<unknown> {
    return this.procedures.admitTransitDetainee(actor, detaineeId, body);
  }

  @Get(':id')
  @RequirePermissions(SITOP_PERMISSIONS.PROCEDURES_VIEW)
  getOne(@GetUser() actor: AuthenticatedOfficer, @Param('id') id: string): Promise<unknown> {
    return this.procedures.getById(actor, id);
  }

  @Post(':id/arrival')
  @RequirePermissions(SITOP_PERMISSIONS.PROCEDURES_MANAGE)
  registerArrival(
    @GetUser() actor: AuthenticatedOfficer,
    @Param('id') id: string,
    @Body()
    body: {
      descripcion: string;
      latitude?: number;
      longitude?: number;
      bringsDetainee: boolean;
      bringsObjects: boolean;
      bringsVehicles?: boolean;
      bringsPersons?: boolean;
      officerIds: string[];
      leaderOfficerId?: string;
      vehicles?: Array<{
        plate: string;
        vehicleType: VehicleType;
        ownerCedula?: string;
        notes?: string;
      }>;
    },
  ): Promise<unknown> {
    return this.procedures.registerArrival(actor, id, body);
  }

  @Post(':id/close')
  @RequirePermissions(SITOP_PERMISSIONS.PROCEDURES_MANAGE)
  @UseInterceptors(DetaineePhotosInterceptor())
  closeProcedure(
    @GetUser() actor: AuthenticatedOfficer,
    @Param('id') id: string,
    @Body()
    body: {
      outcome: ProcedureOutcome;
      fijaciones?: string;
      nombres?: string;
      apellidos?: string;
      cedula?: string;
      alias?: string;
      delitoInicial?: string;
      objectDescription?: string;
      fijacionCompleta?: string | boolean;
      bringsDetainee?: string | boolean;
      bringsObjects?: string | boolean;
    },
    @Req() request: { files?: Record<string, Express.Multer.File[]> },
  ): Promise<unknown> {
    const fijacionCompleta =
      body.fijacionCompleta === true ||
      body.fijacionCompleta === 'true' ||
      body.fijacionCompleta === '1';

    return this.procedures.closeProcedure(
      actor,
      id,
      {
        outcome: body.outcome,
        fijaciones: body.fijaciones,
        nombres: body.nombres,
        apellidos: body.apellidos,
        cedula: body.cedula,
        alias: body.alias,
        delitoInicial: body.delitoInicial,
        objectDescription: body.objectDescription,
        fijacionCompleta,
      },
      request.files,
    );
  }

  @Post(':id/complete-fijacion')
  @RequirePermissions(SITOP_PERMISSIONS.PROCEDURES_MANAGE)
  @UseInterceptors(DetaineePhotosInterceptor())
  completeCommandFijacion(
    @GetUser() actor: AuthenticatedOfficer,
    @Param('id') id: string,
    @Req() request: { files?: Record<string, Express.Multer.File[]> },
  ): Promise<unknown> {
    return this.procedures.completeCommandFijacion(actor, id, request.files);
  }
}
