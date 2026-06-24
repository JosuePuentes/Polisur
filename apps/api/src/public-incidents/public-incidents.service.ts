import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EvidenceStage,
  IncidentOrigin,
  IncidentStatus,
  PrismaService,
} from '@polisur/database';
import { randomBytes } from 'node:crypto';
import { INCIDENT_LIST_INCLUDE } from '../incidents/incidents.constants';
import { EvidenceStorageService } from '../incidents/services/evidence-storage.service';
import { IncidentWithRelations } from '../incidents/incidents.types';
import { TacticalGateway } from '../realtime/tactical.gateway';
import {
  PanicAlertPayload,
  TacticalIncidentPayload,
} from '../realtime/tactical.types';
import { PANIC_CRIME_TYPE, PUBLIC_DISPATCH_DEPARTMENT_CODE } from './constants/cuadrante-coordinates.constants';
import { CreatePanicAlertDto } from './dto/create-panic-alert.dto';
import { CreatePublicDenunciaDto } from './dto/create-public-denuncia.dto';
import {
  resolveCuadranteByCoordinates,
  resolveCuadranteBySector,
} from './utils/cuadrante-resolver.util';

export interface PublicIncidentResult {
  id: string;
  code: string;
  status: IncidentStatus;
  cuadrante: string;
  message: string;
}

@Injectable()
export class PublicIncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evidenceStorage: EvidenceStorageService,
    private readonly tacticalGateway: TacticalGateway,
  ) {}

  async createAnonymousDenuncia(
    dto: CreatePublicDenunciaDto,
    evidenceFiles: Express.Multer.File[] = [],
  ): Promise<PublicIncidentResult> {
    const { departmentId, squadId } = await this.resolveDispatchAssignment();
    const cuadrante = resolveCuadranteBySector(dto.sector);
    const code = await this.generateUniqueIncidentCode();

    const incident = await this.prisma.$transaction(async (tx) => {
      const created = await tx.incident.create({
        data: {
          code,
          tipoDelito: dto.delito,
          status: IncidentStatus.PENDIENTE,
          parroquia: dto.parroquia,
          cuadrante,
          descripcion: `[Denuncia anónima · ${dto.sector}] ${dto.descripcion}`,
          departmentId,
          squadId,
          origen: IncidentOrigin.PUBLICO_ANONIMO,
        },
        include: INCIDENT_LIST_INCLUDE,
      });

      for (const [index, file] of evidenceFiles.entries()) {
        const imageUrl = await this.evidenceStorage.saveOptimizedWebp(
          file.buffer,
          created.id,
        );

        await tx.incidentEvidence.create({
          data: {
            incidentId: created.id,
            imageUrl,
            stage: EvidenceStage.RETORNO_CALLE,
            descripcion: `Evidencia ciudadana #${index + 1}`,
          },
        });
      }

      return tx.incident.findUniqueOrThrow({
        where: { id: created.id },
        include: INCIDENT_LIST_INCLUDE,
      });
    });

    const payload = this.toTacticalPayload(incident);
    this.tacticalGateway.broadcastIncidentCreated(payload);

    return {
      id: incident.id,
      code: incident.code,
      status: incident.status,
      cuadrante: incident.cuadrante,
      message:
        'Denuncia registrada de forma anónima. El despacho central ha sido notificado.',
    };
  }

  async createPanicAlert(dto: CreatePanicAlertDto): Promise<PublicIncidentResult> {
    const { departmentId, squadId } = await this.resolveDispatchAssignment();
    const cuadrante = resolveCuadranteByCoordinates(dto.latitud, dto.longitud);
    const code = await this.generateUniqueIncidentCode('PAN');

    const incident = await this.prisma.incident.create({
      data: {
        code,
        tipoDelito: PANIC_CRIME_TYPE,
        status: IncidentStatus.EN_TRANSITO,
        parroquia: 'San Francisco',
        cuadrante,
        descripcion:
          `ALERTA BOTÓN DE PÁNICO CIUDADANO — Coordenadas WGS84: ` +
          `${dto.latitud.toFixed(6)}, ${dto.longitud.toFixed(6)}. ` +
          `Despacho automático al ${cuadrante}. Prioridad máxima.`,
        latitude: dto.latitud,
        longitude: dto.longitud,
        departmentId,
        squadId,
        origen: IncidentOrigin.PUBLICO_PANICO,
      },
      include: INCIDENT_LIST_INCLUDE,
    });

    const payload: PanicAlertPayload = {
      ...this.toTacticalPayload(incident),
      alertType: 'PANIC',
    };

    this.tacticalGateway.broadcastPanicAlert(payload);

    return {
      id: incident.id,
      code: incident.code,
      status: incident.status,
      cuadrante: incident.cuadrante,
      message: 'Alerta enviada — Comisión en camino.',
    };
  }

  private async resolveDispatchAssignment(): Promise<{
    departmentId: string;
    squadId: string;
  }> {
    const department = await this.prisma.department.findFirst({
      where: {
        code: PUBLIC_DISPATCH_DEPARTMENT_CODE,
        isActive: true,
      },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException(
        'Departamento de despacho público no configurado en el sistema',
      );
    }

    const squad = await this.prisma.squad.findFirst({
      where: {
        departmentId: department.id,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!squad) {
      throw new BadRequestException(
        'No hay escuadra activa disponible para despacho de emergencias',
      );
    }

    return { departmentId: department.id, squadId: squad.id };
  }

  private async generateUniqueIncidentCode(
    prefix = 'POL',
  ): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const suffix = randomBytes(2).toString('hex').toUpperCase();
      const code = `${prefix}-${date}-${suffix}`;

      const existing = await this.prisma.incident.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }
    }

    throw new BadRequestException(
      'No fue posible generar un código único de incidente público',
    );
  }

  private toTacticalPayload(incident: IncidentWithRelations): TacticalIncidentPayload {
    return {
      id: incident.id,
      code: incident.code,
      tipoDelito: incident.tipoDelito,
      status: incident.status,
      parroquia: incident.parroquia,
      cuadrante: incident.cuadrante,
      descripcion: incident.descripcion,
      latitude: incident.latitude,
      longitude: incident.longitude,
      origen: incident.origen,
      createdAt: incident.createdAt.toISOString(),
      department: incident.department,
      squad: {
        id: incident.squad.id,
        name: incident.squad.name,
        callsign: incident.squad.callsign,
      },
    };
  }
}
