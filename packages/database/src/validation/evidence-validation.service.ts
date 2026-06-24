import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EvidenceStage, IncidentStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  EVIDENCE_STAGE_LIMITS,
  RESENA_COMANDO_EVIDENCE_LIMIT,
  RETORNO_CALLE_EVIDENCE_LIMIT,
} from './evidence.constants';

@Injectable()
export class EvidenceValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida que el incidente exista, que la escuadra pertenezca al departamento
   * y que no se excedan los límites de evidencia por etapa.
   */
  async assertCanAttachEvidence(
    incidentId: string,
    stage: EvidenceStage,
  ): Promise<void> {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: { id: true, status: true },
    });

    if (!incident) {
      throw new NotFoundException(`Incidente ${incidentId} no encontrado`);
    }

    if (
      incident.status === IncidentStatus.CERRADO ||
      incident.status === IncidentStatus.PROCESADO
    ) {
      throw new BadRequestException(
        'No se pueden adjuntar evidencias a un incidente cerrado o procesado',
      );
    }

    const currentCount = await this.prisma.incidentEvidence.count({
      where: { incidentId, stage },
    });

    const limit = EVIDENCE_STAGE_LIMITS[stage];

    if (currentCount >= limit) {
      const label =
        stage === EvidenceStage.RETORNO_CALLE
          ? `máximo ${RETORNO_CALLE_EVIDENCE_LIMIT} fotos de retorno en calle`
          : `máximo ${RESENA_COMANDO_EVIDENCE_LIMIT} foto de reseña en comando`;

      throw new BadRequestException(
        `Límite de evidencia alcanzado para la etapa ${stage}: ${label}`,
      );
    }
  }

  /**
   * Exige 3 evidencias RETORNO_CALLE y 1 RESEÑA_COMANDO antes de marcar PROCESADO.
   */
  async assertReadyForProcessed(incidentId: string): Promise<void> {
    const counts = await this.prisma.incidentEvidence.groupBy({
      by: ['stage'],
      where: { incidentId },
      _count: { _all: true },
    });

    const byStage = new Map(
      counts.map((row) => [row.stage, row._count._all]),
    );

    const retorno = byStage.get(EvidenceStage.RETORNO_CALLE) ?? 0;
    const resena = byStage.get(EvidenceStage.RESEÑA_COMANDO) ?? 0;

    if (retorno < RETORNO_CALLE_EVIDENCE_LIMIT) {
      throw new BadRequestException(
        `Se requieren ${RETORNO_CALLE_EVIDENCE_LIMIT} evidencias en etapa RETORNO_CALLE (actual: ${retorno})`,
      );
    }

    if (resena < RESENA_COMANDO_EVIDENCE_LIMIT) {
      throw new BadRequestException(
        `Se requiere ${RESENA_COMANDO_EVIDENCE_LIMIT} evidencia en etapa RESEÑA_COMANDO (actual: ${resena})`,
      );
    }
  }

  /**
   * La escuadra actuante debe pertenecer al departamento responsable del caso.
   */
  async assertSquadBelongsToDepartment(
    squadId: string,
    departmentId: string,
  ): Promise<void> {
    const squad = await this.prisma.squad.findFirst({
      where: { id: squadId, departmentId, isActive: true },
      select: { id: true },
    });

    if (!squad) {
      throw new BadRequestException(
        'La escuadra no pertenece al departamento indicado o está inactiva',
      );
    }
  }
}
