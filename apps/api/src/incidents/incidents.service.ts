import {

  BadRequestException,

  ForbiddenException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import {

  CreateEvidenceDto,

  CreateIncidentDto,

  EvidenceValidationService,

  IncidentStatus,

  Prisma,

  PrismaService,

  RangeRole,

} from '@polisur/database';

import { randomBytes } from 'node:crypto';
import type { Response } from 'express';

import { CRITICAL_ACTION_LABELS } from '../audit/audit.constants';

import { AuditService } from '../audit/audit.service';

import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';

import {

  INCIDENT_DETAIL_INCLUDE,

  INCIDENT_LIST_INCLUDE,

} from './incidents.constants';

import { OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE } from './incidents-access.constants';

import { UploadEvidenceDto } from './dto/upload-evidence.dto';

import { EvidenceStorageService } from './services/evidence-storage.service';

import {

  IncidentEvidence,

  IncidentWithRelations,

} from './incidents.types';



interface IncidentAccessScope {

  id: string;

  code: string;

  status: IncidentStatus;

  departmentId: string;

  squadId: string;

}



@Injectable()

export class IncidentsService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly evidenceValidation: EvidenceValidationService,

    private readonly evidenceStorage: EvidenceStorageService,

    private readonly auditService: AuditService,

  ) {}



  async create(

    dto: CreateIncidentDto,

    actor: AuthenticatedOfficer,

  ): Promise<IncidentWithRelations> {

    this.assertOfficerCanCreateIncident(actor, dto);



    await this.evidenceValidation.assertSquadBelongsToDepartment(

      dto.squadId,

      dto.departmentId,

    );



    const code = await this.generateUniqueIncidentCode();



    return this.prisma.incident.create({

      data: {

        code,

        tipoDelito: dto.tipoDelito,

        parroquia: dto.parroquia,

        cuadrante: dto.cuadrante,

        descripcion: dto.descripcion,

        departmentId: dto.departmentId,

        squadId: dto.squadId,

        status: IncidentStatus.PENDIENTE,

      },

      include: INCIDENT_DETAIL_INCLUDE,

    });

  }



  async findAllByOfficer(

    officerId: string,

    role: RangeRole,

    departmentId: string,

    squadId?: string | null,

  ): Promise<IncidentWithRelations[]> {

    const where = this.buildVisibilityFilter(

      role,

      departmentId,

      squadId,

      officerId,

    );



    return this.prisma.incident.findMany({

      where,

      include: INCIDENT_LIST_INCLUDE,

      orderBy: { createdAt: 'desc' },

    });

  }



  async addEvidence(

    dto: CreateEvidenceDto,

    actor: AuthenticatedOfficer,

  ): Promise<IncidentEvidence> {

    await this.assertOfficerCanMutateIncident(actor, dto.incidentId);



    await this.evidenceValidation.assertCanAttachEvidence(

      dto.incidentId,

      dto.stage,

    );



    return this.prisma.incidentEvidence.create({

      data: {

        incidentId: dto.incidentId,

        imageUrl: dto.urlImagen,

        stage: dto.stage,

        descripcion: dto.descripcion,

      },

    });

  }



  async addEvidenceFromUpload(

    dto: UploadEvidenceDto,

    optimizedBuffer: Buffer,

    actor: AuthenticatedOfficer,

  ): Promise<IncidentEvidence> {

    if (!optimizedBuffer?.length) {

      throw new BadRequestException('Buffer de imagen optimizada inválido');

    }



    await this.assertOfficerCanMutateIncident(actor, dto.incidentId);



    await this.evidenceValidation.assertCanAttachEvidence(

      dto.incidentId,

      dto.stage,

    );



    const imageUrl = await this.evidenceStorage.saveOptimizedWebp(

      optimizedBuffer,

      dto.incidentId,

    );



    return this.prisma.incidentEvidence.create({

      data: {

        incidentId: dto.incidentId,

        imageUrl,

        stage: dto.stage,

        descripcion: dto.descripcion,

      },

    });

  }



  async updateStatus(

    incidentId: string,

    status: IncidentStatus,

    actor: AuthenticatedOfficer,

    clientIp?: string,

  ): Promise<IncidentWithRelations> {

    const incident = await this.assertOfficerCanMutateIncident(actor, incidentId);



    if (status === IncidentStatus.PROCESADO) {

      await this.evidenceValidation.assertReadyForProcessed(incidentId);

    }



    if (

      status === IncidentStatus.CERRADO &&

      incident.status === IncidentStatus.CERRADO

    ) {

      throw new BadRequestException('El incidente ya está cerrado');

    }



    const updated = await this.prisma.incident.update({

      where: { id: incidentId },

      data: {

        status,

        ...(status === IncidentStatus.CERRADO && { closedAt: new Date() }),

      },

      include: INCIDENT_DETAIL_INCLUDE,

    });



    if (status === IncidentStatus.PROCESADO) {

      this.auditService.logCriticalAction({

        officerId: actor.id,

        rangeRole: actor.rangeRole,

        clientIp,

        actionLabel: CRITICAL_ACTION_LABELS.INCIDENT_STATUS_PROCESADO,

        metadata: {

          incidentId,

          incidentCode: incident.code,

          previousStatus: incident.status,

          newStatus: status,

        },

      });

    }



    return updated;
  }

  async streamEvidenceFile(
    filename: string,
    actor: AuthenticatedOfficer,
    res: Response,
  ): Promise<void> {
    this.evidenceStorage.assertSafeFilename(filename);

    const record = await this.prisma.incidentEvidence.findFirst({
      where: { imageUrl: { endsWith: filename } },
      select: { incidentId: true },
    });

    if (!record) {
      throw new NotFoundException('Evidencia no encontrada');
    }

    await this.assertOfficerCanMutateIncident(actor, record.incidentId);

    const absolutePath = this.evidenceStorage.resolveAbsolutePath(filename);

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    await new Promise<void>((resolve, reject) => {
      res.sendFile(absolutePath, (error) => {
        if (error) {
          reject(new NotFoundException('Archivo de evidencia no disponible'));
          return;
        }
        resolve();
      });
    });
  }

  private assertOfficerCanCreateIncident(

    actor: AuthenticatedOfficer,

    dto: CreateIncidentDto,

  ): void {

    if (actor.rangeRole === RangeRole.DISCENTE) {

      throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);

    }



    if (actor.rangeRole === RangeRole.SUPER_ADMIN) {

      return;

    }



    if (actor.rangeRole === RangeRole.JEFE_DEPARTAMENTO) {

      if (dto.departmentId !== actor.departmentId) {

        throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);

      }

      return;

    }



    if (actor.rangeRole === RangeRole.OFICIAL_ACTIVO) {

      if (!actor.squadId) {

        throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);

      }



      if (

        dto.departmentId !== actor.departmentId ||

        dto.squadId !== actor.squadId

      ) {

        throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);

      }

      return;

    }



    throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);

  }



  private async assertOfficerCanMutateIncident(

    actor: AuthenticatedOfficer,

    incidentId: string,

  ): Promise<IncidentAccessScope> {

    const incident = await this.prisma.incident.findUnique({

      where: { id: incidentId },

      select: {

        id: true,

        code: true,

        status: true,

        departmentId: true,

        squadId: true,

      },

    });



    if (!incident) {

      throw new NotFoundException(`Incidente ${incidentId} no encontrado`);

    }



    if (actor.rangeRole === RangeRole.DISCENTE) {

      throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);

    }



    if (actor.rangeRole === RangeRole.SUPER_ADMIN) {

      return incident;

    }



    if (actor.rangeRole === RangeRole.JEFE_DEPARTAMENTO) {

      if (incident.departmentId !== actor.departmentId) {

        throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);

      }

      return incident;

    }



    if (actor.rangeRole === RangeRole.OFICIAL_ACTIVO) {

      if (!actor.squadId || incident.squadId !== actor.squadId) {

        throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);

      }

      return incident;

    }



    throw new ForbiddenException(OPERATIONAL_RESOURCE_FORBIDDEN_MESSAGE);

  }



  private buildVisibilityFilter(

    role: RangeRole,

    departmentId: string,

    squadId: string | null | undefined,

    officerId: string,

  ): Prisma.IncidentWhereInput {

    switch (role) {

      case RangeRole.SUPER_ADMIN:

        return {};



      case RangeRole.JEFE_DEPARTAMENTO:

        return { departmentId };



      case RangeRole.OFICIAL_ACTIVO:

        if (!squadId) {

          throw new ForbiddenException(

            `El funcionario ${officerId} no tiene escuadra asignada; no puede consultar incidentes`,

          );

        }

        return { squadId };



      case RangeRole.DISCENTE:

        throw new ForbiddenException(

          'Los discentes no tienen autorización para consultar el registro de incidentes',

        );



      default: {

        const _exhaustive: never = role;

        return _exhaustive;

      }

    }

  }



  private async generateUniqueIncidentCode(): Promise<string> {

    for (let attempt = 0; attempt < 8; attempt += 1) {

      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      const suffix = randomBytes(2).toString('hex').toUpperCase();

      const code = `POL-${date}-${suffix}`;



      const existing = await this.prisma.incident.findUnique({

        where: { code },

        select: { id: true },

      });



      if (!existing) {

        return code;

      }

    }



    throw new BadRequestException(

      'No fue posible generar un código único de incidente',

    );

  }

}


