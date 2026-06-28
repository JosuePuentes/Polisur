import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DetaineePhotoKind,
  DetaineeStatus,
  MinuteRole,
  Prisma,
  PrismaService,
  ProcedureOutcome,
  ProcedureStatus,
  VehicleType,
} from '@polisur/database';
import { randomBytes } from 'node:crypto';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import {
  assertDepartmentAccess,
  resolveScopedDepartmentId,
} from '../common/utils/operational-scope.util';
import { DETAINEE_PHOTO_FIELD_MAP } from '../operations/interceptors/detainee-photos.interceptor';
import { DetaineeStorageService } from '../operations/services/detainee-storage.service';

const PROCEDURE_INCLUDE = {
  department: { select: { id: true, name: true, code: true } },
  squad: { select: { id: true, name: true, callsign: true } },
  departureMinute: {
    include: {
      officers: {
        include: {
          officer: {
            select: { id: true, nombres: true, apellidos: true, cedula: true, grado: true },
          },
        },
      },
      vehicles: true,
    },
  },
  arrivalMinute: {
    include: {
      officers: {
        include: {
          officer: {
            select: { id: true, nombres: true, apellidos: true, cedula: true, grado: true },
          },
        },
      },
      recoveredObjects: true,
      vehicles: true,
    },
  },
  detainee: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      status: true,
      detentionCellId: true,
    },
  },
  closedByOfficer: {
    select: { id: true, nombres: true, apellidos: true },
  },
} satisfies Prisma.ProcedureInclude;

@Injectable()
export class ProceduresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly detaineeStorage: DetaineeStorageService,
  ) {}

  list(actor: AuthenticatedOfficer, scope: 'active' | 'completed' | 'all' = 'active'): Promise<unknown[]> {
    const scopedDept = resolveScopedDepartmentId(actor);
    const statusFilter =
      scope === 'active'
        ? { in: [ProcedureStatus.EN_CURSO, ProcedureStatus.PENDIENTE_CIERRE, ProcedureStatus.PENDIENTE_FIJACION] }
        : scope === 'completed'
          ? { in: [ProcedureStatus.SIN_NOVEDAD, ProcedureStatus.EXITOSO] }
          : undefined;

    return this.prisma.procedure.findMany({
      where: {
        ...(scopedDept ? { departmentId: scopedDept } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: PROCEDURE_INCLUDE,
    });
  }

  getById(actor: AuthenticatedOfficer, id: string): Promise<unknown> {
    return this.findProcedure(actor, id);
  }

  async registerArrival(
    actor: AuthenticatedOfficer,
    procedureId: string,
    data: {
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
    const procedure = await this.findProcedure(actor, procedureId);

    if (procedure.status !== ProcedureStatus.EN_CURSO) {
      throw new BadRequestException('Este procedimiento ya tiene minuta de llegada registrada');
    }

    if (!data.officerIds.length) {
      throw new BadRequestException('Debe incluir al menos un funcionario en la minuta de llegada');
    }

    const departure = procedure.departureMinute;
    const code = `PAT-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    const officers = await this.prisma.officer.findMany({
      where: { id: { in: data.officerIds } },
      select: { id: true, departmentId: true, squadId: true },
    });

    if (officers.length !== data.officerIds.length) {
      throw new BadRequestException('Uno o más funcionarios no existen');
    }

    const mergedNarrative = [
      departure.reseñaPrefix ? `${departure.reseñaPrefix}\n` : '',
      departure.descripcion,
      '',
      '--- MINUTA DE LLEGADA ---',
      data.descripcion.trim(),
    ].join('\n');

    const normalizedVehicles = (data.vehicles ?? [])
      .map((vehicle) => ({
        plate: vehicle.plate.replace(/[\s-]/g, '').toUpperCase().trim(),
        vehicleType: vehicle.vehicleType,
        ownerCedula: vehicle.ownerCedula?.trim() || undefined,
        notes: vehicle.notes?.trim() || undefined,
      }))
      .filter((vehicle) => vehicle.plate.length >= 3);

    return this.prisma.$transaction(async (tx) => {
      const arrivalMinute = await tx.patrolMinute.create({
        data: {
          code,
          patrolType: departure.patrolType,
          minuteRole: MinuteRole.LLEGADA,
          parroquia: departure.parroquia,
          cuadrante: departure.cuadrante,
          descripcion: data.descripcion.trim(),
          latitude: data.latitude,
          longitude: data.longitude,
          departmentId: departure.departmentId,
          squadId: departure.squadId,
          createdByOfficerId: actor.id,
          officers: {
            create: officers.map((officer) => ({
              officerId: officer.id,
              departmentId: officer.departmentId,
              squadId: officer.squadId,
              isSquadLeader: officer.id === data.leaderOfficerId,
              externalSquad: officer.departmentId !== departure.departmentId,
            })),
          },
          ...(normalizedVehicles.length
            ? { vehicles: { create: normalizedVehicles } }
            : {}),
        },
      });

      return tx.procedure.update({
        where: { id: procedureId },
        data: {
          status: ProcedureStatus.PENDIENTE_CIERRE,
          arrivalMinuteId: arrivalMinute.id,
          bringsDetainee: data.bringsDetainee,
          bringsObjects: data.bringsObjects,
          bringsVehicles: data.bringsVehicles ?? false,
          bringsPersons: data.bringsPersons ?? false,
          mergedNarrative,
        },
        include: PROCEDURE_INCLUDE,
      });
    });
  }

  async closeProcedure(
    actor: AuthenticatedOfficer,
    procedureId: string,
    data: {
      outcome: ProcedureOutcome;
      fijaciones?: string;
      nombres?: string;
      apellidos?: string;
      cedula?: string;
      alias?: string;
      delitoInicial?: string;
      objectDescription?: string;
      fijacionCompleta?: boolean;
    },
    files?: Record<string, Express.Multer.File[]>,
  ): Promise<unknown> {
    const procedure = await this.findProcedure(actor, procedureId);

    if (procedure.status !== ProcedureStatus.PENDIENTE_CIERRE) {
      throw new BadRequestException(
        'Solo puede cerrar procedimientos con minuta de llegada registrada',
      );
    }

    if (data.outcome === ProcedureOutcome.SIN_NOVEDAD) {
      return this.prisma.procedure.update({
        where: { id: procedureId },
        data: {
          status: ProcedureStatus.SIN_NOVEDAD,
          outcome: ProcedureOutcome.SIN_NOVEDAD,
          closedAt: new Date(),
          closedByOfficerId: actor.id,
          fijaciones: data.fijaciones?.trim() || null,
        },
        include: PROCEDURE_INCLUDE,
      });
    }

    if (data.outcome === ProcedureOutcome.TRASLADO_OBJETO) {
      if (!procedure.bringsObjects) {
        throw new BadRequestException('La minuta de llegada no indicó objetos recuperados');
      }
      if (!data.objectDescription?.trim()) {
        throw new BadRequestException('Debe describir el objeto a trasladar');
      }

      return this.prisma.$transaction(async (tx) => {
        if (procedure.arrivalMinuteId) {
          await tx.recoveredObject.create({
            data: {
              patrolMinuteId: procedure.arrivalMinuteId,
              description: data.objectDescription!.trim(),
              quantity: 1,
            },
          });
        }

        return tx.procedure.update({
          where: { id: procedureId },
          data: {
            status: ProcedureStatus.EXITOSO,
            outcome: ProcedureOutcome.TRASLADO_OBJETO,
            closedAt: new Date(),
            closedByOfficerId: actor.id,
            fijaciones: data.fijaciones?.trim() || null,
          },
          include: PROCEDURE_INCLUDE,
        });
      });
    }

    if (data.outcome === ProcedureOutcome.TRASLADO_CIUDADANO) {
      if (!procedure.bringsDetainee) {
        throw new BadRequestException('La minuta de llegada no indicó ciudadano detenido');
      }
      if (!data.nombres?.trim() || !data.apellidos?.trim()) {
        throw new BadRequestException('Debe indicar nombres y apellidos del ciudadano');
      }
      if (!data.fijaciones?.trim()) {
        throw new BadRequestException('Debe registrar las fijaciones del procedimiento');
      }

      const uploadedPhotoCount = files
        ? Object.keys(DETAINEE_PHOTO_FIELD_MAP).filter((field) => files[field]?.[0]?.buffer)
            .length
        : 0;
      const needsMoreFijacion =
        !data.fijacionCompleta || uploadedPhotoCount < 6;

      const notas = [
        procedure.mergedNarrative ?? '',
        '',
        '--- FIJACIONES ---',
        data.fijaciones.trim(),
      ].join('\n');

      return this.prisma.$transaction(async (tx) => {
        const detainee = await tx.detainee.create({
          data: {
            cedula: data.cedula?.trim() || null,
            nombres: data.nombres!.trim(),
            apellidos: data.apellidos!.trim(),
            alias: data.alias?.trim() || null,
            status: DetaineeStatus.EN_TRANSITO,
            notas,
            records: {
              create: {
                delito: data.delitoInicial?.trim() || 'Pendiente de confirmación en calabozo',
                officerId: actor.id,
              },
            },
          },
        });

        if (files && uploadedPhotoCount > 0) {
          await this.persistDetaineePhotos(detainee.id, files);
        }

        return tx.procedure.update({
          where: { id: procedureId },
          data: {
            status: needsMoreFijacion
              ? ProcedureStatus.PENDIENTE_FIJACION
              : ProcedureStatus.EXITOSO,
            outcome: ProcedureOutcome.TRASLADO_CIUDADANO,
            closedAt: needsMoreFijacion ? null : new Date(),
            closedByOfficerId: needsMoreFijacion ? null : actor.id,
            fijaciones: data.fijaciones!.trim(),
            fijacionCompleta: !needsMoreFijacion,
            detaineeId: detainee.id,
          },
          include: PROCEDURE_INCLUDE,
        });
      });
    }

    throw new BadRequestException('Resultado de cierre no válido');
  }

  async completeCommandFijacion(
    actor: AuthenticatedOfficer,
    procedureId: string,
    files?: Record<string, Express.Multer.File[]>,
  ): Promise<unknown> {
    const procedure = await this.findProcedure(actor, procedureId);

    if (procedure.status !== ProcedureStatus.PENDIENTE_FIJACION) {
      throw new BadRequestException('Este procedimiento no está pendiente de fijación en comando');
    }

    const uploadedPhotoCount = files
      ? Object.keys(DETAINEE_PHOTO_FIELD_MAP).filter((field) => files[field]?.[0]?.buffer)
          .length
      : 0;
    if (uploadedPhotoCount < 6) {
      throw new BadRequestException('Debe adjuntar al menos 6 fotografías de fijación en comando');
    }

    if (!procedure.detaineeId) {
      throw new BadRequestException('No hay ciudadano vinculado al procedimiento');
    }

    await this.persistDetaineePhotos(procedure.detaineeId, files!);

    return this.prisma.procedure.update({
      where: { id: procedureId },
      data: {
        status: ProcedureStatus.EXITOSO,
        fijacionCompleta: true,
        closedAt: new Date(),
        closedByOfficerId: actor.id,
      },
      include: PROCEDURE_INCLUDE,
    });
  }

  async admitTransitDetainee(
    actor: AuthenticatedOfficer,
    detaineeId: string,
    data: {
      detentionCellId: string;
      delitoInicial: string;
      nombres?: string;
      apellidos?: string;
      cedula?: string;
      alias?: string;
      notas?: string;
    },
  ): Promise<unknown> {
    const detainee = await this.prisma.detainee.findUnique({
      where: { id: detaineeId },
      include: { procedure: { select: { departmentId: true } } },
    });

    if (!detainee) {
      throw new NotFoundException('Detenido no encontrado');
    }

    if (detainee.status !== DetaineeStatus.EN_TRANSITO) {
      throw new BadRequestException('El ciudadano no está en tránsito hacia calabozos');
    }

    if (detainee.procedure) {
      assertDepartmentAccess(actor, detainee.procedure.departmentId);
    }

    const cell = await this.prisma.detentionCell.findUnique({
      where: { id: data.detentionCellId },
    });
    if (!cell?.isActive) {
      throw new BadRequestException('Celda no válida o inactiva');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.detainee.update({
        where: { id: detaineeId },
        data: {
          status: DetaineeStatus.EN_CALABOZO,
          detentionCellId: data.detentionCellId,
          nombres: data.nombres?.trim() || detainee.nombres,
          apellidos: data.apellidos?.trim() || detainee.apellidos,
          cedula: data.cedula?.trim() || detainee.cedula,
          alias: data.alias?.trim() || detainee.alias,
          notas: data.notas?.trim() || detainee.notas,
        },
      });

      const latestRecord = await tx.detaineeRecord.findFirst({
        where: { detaineeId },
        orderBy: { fecha: 'desc' },
      });

      if (latestRecord) {
        await tx.detaineeRecord.update({
          where: { id: latestRecord.id },
          data: { delito: data.delitoInicial.trim() },
        });
      } else {
        await tx.detaineeRecord.create({
          data: {
            detaineeId,
            delito: data.delitoInicial.trim(),
            officerId: actor.id,
          },
        });
      }
    });

    return this.prisma.detainee.findUnique({
      where: { id: detaineeId },
      include: {
        detentionCell: true,
        photos: true,
        records: true,
        procedure: { select: { id: true, code: true, mergedNarrative: true } },
      },
    });
  }

  private async findProcedure(actor: AuthenticatedOfficer, id: string) {
    const procedure = await this.prisma.procedure.findUnique({
      where: { id },
      include: PROCEDURE_INCLUDE,
    });

    if (!procedure) {
      throw new NotFoundException('Procedimiento no encontrado');
    }

    assertDepartmentAccess(actor, procedure.departmentId);
    return procedure;
  }

  private async persistDetaineePhotos(
    detaineeId: string,
    files: Record<string, Express.Multer.File[]>,
  ): Promise<void> {
    for (const [field, meta] of Object.entries(DETAINEE_PHOTO_FIELD_MAP)) {
      const uploaded = files[field]?.[0];
      if (!uploaded?.buffer) continue;

      const saved = await this.detaineeStorage.saveWebp(
        uploaded.buffer,
        detaineeId,
        meta.kind.toLowerCase(),
      );

      await this.prisma.detaineePhoto.create({
        data: {
          detaineeId,
          kind: meta.kind as DetaineePhotoKind,
          label: meta.label,
          filename: saved.filename,
          publicUrl: saved.publicUrl,
          isPrimary: Boolean(meta.isPrimary),
        },
      });
    }
  }
}
