import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateIncidentDto } from '@polisur/database';
import { SITOP_PERMISSIONS } from '@polisur/database';
import { AuditController } from '../audit/decorators/audit-controller.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { resolveClientIp } from '../common/utils/client-ip.util';
import { UploadEvidenceDto } from './dto/upload-evidence.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { EvidenceUploadInterceptor } from './interceptors/evidence-upload.interceptor';
import { IncidentsService } from './incidents.service';
import {
  IncidentEvidence,
  IncidentWithRelations,
} from './incidents.types';

@ApiTags('Incidentes')
@ApiBearerAuth('JWT')
@AuditController()
@Controller('incidents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get('catalogs')
  @RequirePermissions(SITOP_PERMISSIONS.INCIDENTS_CREATE)
  @ApiOperation({ summary: 'Catálogos operativos para crear incidentes' })
  getCatalogs(@GetUser() officer: AuthenticatedOfficer) {
    return this.incidentsService.getOperationalCatalogs(officer);
  }

  @Post()
  @RequirePermissions(SITOP_PERMISSIONS.INCIDENTS_CREATE)
  @ApiOperation({ summary: 'Registrar un nuevo incidente táctico' })
  @ApiResponse({ status: 201, description: 'Incidente creado exitosamente' })
  create(
    @Body() createIncidentDto: CreateIncidentDto,
    @GetUser() officer: AuthenticatedOfficer,
  ): Promise<IncidentWithRelations> {
    return this.incidentsService.create(createIncidentDto, officer);
  }

  @Get()
  @RequirePermissions(SITOP_PERMISSIONS.INCIDENTS_VIEW)
  @ApiOperation({
    summary: 'Listar incidentes según el rol y ámbito del funcionario autenticado',
  })
  @ApiResponse({ status: 200, description: 'Listado jerárquico de incidentes' })
  findAll(
    @GetUser() officer: AuthenticatedOfficer,
  ): Promise<IncidentWithRelations[]> {
    return this.incidentsService.findAllByOfficer(
      officer.id,
      officer.rangeRole,
      officer.departmentId,
      officer.squadId,
    );
  }

  @Post('evidence')
  @RequirePermissions(SITOP_PERMISSIONS.INCIDENTS_EVIDENCE)
  @UseInterceptors(EvidenceUploadInterceptor('file'))
  @ApiOperation({
    summary: 'Adjuntar evidencia fotográfica optimizada (Sharp → WebP)',
    description:
      'Recibe una imagen vía multipart/form-data, la optimiza in-memory (máx. 1200px, WebP 75%) y la persiste en almacenamiento institucional. Formatos de entrada permitidos: JPG, JPEG, PNG y WebP.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Payload multipart con archivo de evidencia y metadatos del caso',
    schema: {
      type: 'object',
      required: ['file', 'incidentId', 'stage'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (JPG, JPEG, PNG o WebP). Máximo 8 MB.',
        },
        incidentId: {
          type: 'string',
          description: 'ID del incidente',
        },
        stage: {
          type: 'string',
          enum: ['RETORNO_CALLE', 'RESEÑA_COMANDO'],
          description: 'Etapa de la cadena de custodia fotográfica',
        },
        descripcion: {
          type: 'string',
          maxLength: 500,
          description: 'Descripción opcional de la evidencia',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Evidencia registrada y optimizada correctamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'Formato no permitido, archivo corrupto, límite de evidencias alcanzado o incidente cerrado',
  })
  @ApiResponse({ status: 401, description: 'JWT inválido o ausente' })
  addEvidence(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadEvidenceDto: UploadEvidenceDto,
    @GetUser() officer: AuthenticatedOfficer,
  ): Promise<IncidentEvidence> {
    return this.incidentsService.addEvidenceFromUpload(
      uploadEvidenceDto,
      file.buffer,
      officer,
    );
  }

  @Get('evidence/:filename')
  @RequirePermissions(SITOP_PERMISSIONS.INCIDENTS_VIEW)
  @ApiOperation({
    summary: 'Descargar evidencia WebP protegida',
    description:
      'Sirve el archivo comprimido tras validar JWT y ámbito operativo del funcionario.',
  })
  @ApiResponse({ status: 200, description: 'Archivo WebP' })
  @ApiResponse({ status: 403, description: 'Sin permisos sobre el incidente' })
  @ApiResponse({ status: 404, description: 'Evidencia no encontrada' })
  getEvidenceFile(
    @Param('filename') filename: string,
    @GetUser() officer: AuthenticatedOfficer,
    @Res() res: Response,
  ): Promise<void> {
    return this.incidentsService.streamEvidenceFile(filename, officer, res);
  }

  @Patch(':id/status')
  @RequirePermissions(SITOP_PERMISSIONS.INCIDENTS_STATUS)
  @ApiOperation({ summary: 'Actualizar el estatus procesal de un incidente' })
  @ApiResponse({ status: 200, description: 'Estatus actualizado' })
  updateStatus(
    @Param('id') id: string,
    @Body() { status }: UpdateIncidentStatusDto,
    @GetUser() officer: AuthenticatedOfficer,
    @Req() request: Request,
  ): Promise<IncidentWithRelations> {
    return this.incidentsService.updateStatus(
      id,
      status,
      officer,
      resolveClientIp(request),
    );
  }
}
