import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetStatus,
  AssetType,
  DetaineePhotoKind,
  DetaineeStatus,
  MinuteRole,
  PatrolType,
  ProcedureStatus,
  PrismaService,
  RangeRole,
  VehicleType,
  ShiftStatus,
  WeaponStatus,
} from '@polisur/database';
import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type { Response } from 'express';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import {
  assertDepartmentAccess,
  assertSuperAdmin,
  assertPatrolCreateScope,
  resolveScopedDepartmentId,
} from '../common/utils/operational-scope.util';
import {
  assertDetaineeAllowsMutation,
  assertWeaponAssignmentAllowsMutation,
} from '../common/utils/operational-immutability.util';
import { DETAINEE_PHOTO_FIELD_MAP } from './interceptors/detainee-photos.interceptor';
import { DetaineeStorageService } from './services/detainee-storage.service';

const DETAINEE_INCLUDE = {
  detentionCell: { select: { id: true, code: true, name: true, block: true } },
  photos: { orderBy: { createdAt: 'asc' as const } },
  _count: { select: { hearings: true, records: true } },
} as const;

const DETAINEE_DETAIL_INCLUDE = {
  detentionCell: { select: { id: true, code: true, name: true, block: true } },
  photos: { orderBy: { createdAt: 'asc' as const } },
  hearings: { orderBy: { fecha: 'desc' as const } },
  records: {
    orderBy: { fecha: 'desc' as const },
    include: {
      officer: { select: { nombres: true, apellidos: true } },
      incident: { select: { id: true, code: true, tipoDelito: true } },
    },
  },
} as const;

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly detaineeStorage: DetaineeStorageService,
  ) {}

  // ─── COMANDOS ───────────────────────────────────────────────────────────────

  listCommands(actor: AuthenticatedOfficer): Promise<unknown[]> {
    const departmentId = resolveScopedDepartmentId(actor);
    return this.prisma.department.findMany({
      where: { isActive: true, ...(departmentId ? { id: departmentId } : {}) },
      orderBy: { name: 'asc' },
      include: {
        commander: { select: { id: true, nombres: true, apellidos: true, cedula: true } },
        controlPoints: { where: { isActive: true } },
        squads: { where: { isActive: true }, include: { leader: { select: { id: true, nombres: true, apellidos: true } } } },
        _count: { select: { officers: true } },
      },
    });
  }

  async createCommand(
    data: {
      code: string;
      name: string;
      description?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    },
    actor: AuthenticatedOfficer,
  ): Promise<unknown> {
    assertSuperAdmin(actor);

    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();

    if (!code || !name) {
      throw new BadRequestException('Código y nombre de la división son obligatorios');
    }

    const existing = await this.prisma.department.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException('Ya existe un comando con ese código');
    }

    return this.prisma.department.create({
      data: {
        code,
        name,
        description: data.description?.trim() || null,
        address: data.address?.trim() || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      },
    });
  }

  async updateCommand(
    id: string,
    data: {
      name?: string;
      description?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      commanderId?: string | null;
    },
    actor: AuthenticatedOfficer,
  ): Promise<unknown> {
    assertDepartmentAccess(actor, id);
    return this.prisma.department.update({ where: { id }, data });
  }

  createControlPoint(
    data: {
      departmentId: string;
      name: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      pointType?: string;
    },
    actor: AuthenticatedOfficer,
  ): Promise<unknown> {
    assertDepartmentAccess(actor, data.departmentId);
    return this.prisma.controlPoint.create({ data });
  }

  // ─── CUADRANTES ─────────────────────────────────────────────────────────────

  listQuadrants(): Promise<unknown[]> {
    return this.prisma.peaceQuadrant.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async createQuadrant(data: {
    code: string;
    name: string;
    parroquia: string;
    centerLat?: number;
    centerLng?: number;
    boundaryPolygon: [number, number][];
  }): Promise<unknown> {
    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();

    if (!code || !name || !data.parroquia.trim()) {
      throw new BadRequestException('Código, nombre y parroquia son obligatorios');
    }

    if (!Array.isArray(data.boundaryPolygon) || data.boundaryPolygon.length < 3) {
      throw new BadRequestException(
        'Debe delimitar la zona en el mapa con al menos 3 puntos',
      );
    }

    const polygon = data.boundaryPolygon.map(([lat, lng]) => [Number(lat), Number(lng)] as [number, number]);
    const center = this.resolvePolygonCenter(polygon, data.centerLat, data.centerLng);

    const existing = await this.prisma.peaceQuadrant.findFirst({
      where: { OR: [{ code }, { name }] },
    });
    if (existing) {
      throw new BadRequestException('Ya existe un cuadrante con ese código o nombre');
    }

    return this.prisma.peaceQuadrant.create({
      data: {
        code,
        name,
        parroquia: data.parroquia.trim(),
        centerLat: center.lat,
        centerLng: center.lng,
        boundaryPolygon: polygon,
      },
    });
  }

  private resolvePolygonCenter(
    polygon: [number, number][],
    centerLat?: number,
    centerLng?: number,
  ): { lat: number; lng: number } {
    if (centerLat != null && centerLng != null) {
      return { lat: centerLat, lng: centerLng };
    }

    const lat = polygon.reduce((sum, [pLat]) => sum + pLat, 0) / polygon.length;
    const lng = polygon.reduce((sum, [, pLng]) => sum + pLng, 0) / polygon.length;
    return { lat, lng };
  }

  // ─── PATRULLAJE / MINUTAS ───────────────────────────────────────────────────

  listPatrols(actor: AuthenticatedOfficer, departmentId?: string): Promise<unknown[]> {
    const scopedDept = resolveScopedDepartmentId(actor, departmentId);
    return this.prisma.patrolMinute.findMany({
      where: scopedDept ? { departmentId: scopedDept } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        department: { select: { id: true, name: true, code: true } },
        squad: { select: { id: true, name: true } },
        officers: {
          include: {
            officer: { select: { id: true, nombres: true, apellidos: true, cedula: true, grado: true } },
          },
        },
        recoveredObjects: true,
        vehicles: true,
        createdByOfficer: { select: { id: true, nombres: true, apellidos: true } },
      },
    });
  }

  async createPatrol(
    actor: AuthenticatedOfficer,
    data: {
      patrolType: PatrolType;
      minuteRole?: MinuteRole;
      parroquia: string;
      cuadrante: string;
      descripcion: string;
      departmentId: string;
      squadId?: string;
      latitude?: number;
      longitude?: number;
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
    if (!data.officerIds.length) {
      throw new BadRequestException('Debe incluir al menos un funcionario en la minuta');
    }

    const minuteRole = data.minuteRole ?? MinuteRole.SALIDA;
    if (minuteRole === MinuteRole.LLEGADA) {
      throw new BadRequestException(
        'La minuta de llegada se registra desde el módulo de procedimientos en curso',
      );
    }

    assertPatrolCreateScope(actor, data.departmentId, data.squadId);

    if (data.squadId) {
      await this.assertSquadNotInActiveProcedure(data.squadId);
    }

    const code = `PAT-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    const officers = await this.prisma.officer.findMany({
      where: { id: { in: data.officerIds } },
      select: { id: true, departmentId: true, squadId: true },
    });

    if (officers.length !== data.officerIds.length) {
      throw new BadRequestException('Uno o más funcionarios no existen');
    }

    if (actor.rangeRole !== RangeRole.SUPER_ADMIN) {
      const outsiders = officers.filter(
        (officer) => officer.departmentId !== data.departmentId,
      );
      if (outsiders.length > 0) {
        throw new BadRequestException(
          'Todos los funcionarios deben pertenecer al comando de la minuta',
        );
      }
    }

    const normalizedVehicles = (data.vehicles ?? [])
      .map((vehicle) => ({
        plate: vehicle.plate.replace(/[\s-]/g, '').toUpperCase().trim(),
        vehicleType: vehicle.vehicleType,
        ownerCedula: vehicle.ownerCedula?.trim() || undefined,
        notes: vehicle.notes?.trim() || undefined,
      }))
      .filter((vehicle) => vehicle.plate.length >= 3);

    return this.prisma.$transaction(async (tx) => {
      const patrol = await tx.patrolMinute.create({
        data: {
          code,
          patrolType: data.patrolType,
          minuteRole: MinuteRole.SALIDA,
          parroquia: data.parroquia,
          cuadrante: data.cuadrante,
          descripcion: data.descripcion,
          latitude: data.latitude,
          longitude: data.longitude,
          departmentId: data.departmentId,
          squadId: data.squadId,
          createdByOfficerId: actor.id,
          officers: {
            create: officers.map((officer) => ({
              officerId: officer.id,
              departmentId: officer.departmentId,
              squadId: officer.squadId,
              isSquadLeader: officer.id === data.leaderOfficerId,
              externalSquad: officer.departmentId !== data.departmentId,
            })),
          },
          ...(normalizedVehicles.length
            ? {
                vehicles: {
                  create: normalizedVehicles,
                },
              }
            : {}),
        },
        include: {
          officers: { include: { officer: true } },
          recoveredObjects: true,
          vehicles: true,
        },
      });

      const procCode = `PROC-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;
      await tx.procedure.create({
        data: {
          code: procCode,
          departmentId: data.departmentId,
          squadId: data.squadId,
          departureMinuteId: patrol.id,
          status: ProcedureStatus.EN_CURSO,
        },
      });

      return patrol;
    });
  }

  private async assertSquadNotInActiveProcedure(squadId: string): Promise<void> {
    const active = await this.prisma.procedure.findFirst({
      where: {
        squadId,
        status: { in: [ProcedureStatus.EN_CURSO, ProcedureStatus.PENDIENTE_CIERRE] },
      },
      select: { code: true },
    });

    if (active) {
      throw new BadRequestException(
        `La escuadra tiene el procedimiento ${active.code} en curso. Registre la minuta de llegada antes de una nueva salida.`,
      );
    }
  }

  async addRecoveredObject(
    patrolMinuteId: string,
    data: {
      description: string;
      quantity?: number;
      unit?: string;
      photoUrl?: string;
      identifier?: string;
    },
    actor: AuthenticatedOfficer,
  ): Promise<unknown> {
    const patrol = await this.prisma.patrolMinute.findUnique({
      where: { id: patrolMinuteId },
      select: { departmentId: true },
    });
    if (!patrol) {
      throw new NotFoundException('Minuta no encontrada');
    }
    assertDepartmentAccess(actor, patrol.departmentId);
    const identifier = data.identifier?.replace(/[\s-]/g, '').toUpperCase().trim() || undefined;
    return this.prisma.recoveredObject.create({
      data: {
        patrolMinuteId,
        description: data.description,
        quantity: data.quantity ?? 1,
        unit: data.unit,
        photoUrl: data.photoUrl,
        identifier,
      },
    });
  }

  async heatmapData(actor: AuthenticatedOfficer): Promise<{ patrols: unknown[]; incidents: unknown[] }> {
    const departmentId = resolveScopedDepartmentId(actor);
    const patrolWhere = {
      latitude: { not: null },
      longitude: { not: null },
      ...(departmentId ? { departmentId } : {}),
    } as const;
    const incidentWhere: {
      latitude: { not: null };
      longitude: { not: null };
      departmentId?: string;
      squadId?: string;
    } = {
      latitude: { not: null },
      longitude: { not: null },
      ...(departmentId ? { departmentId } : {}),
    };
    if (actor.rangeRole === RangeRole.OFICIAL_ACTIVO && actor.squadId) {
      incidentWhere.squadId = actor.squadId;
    }

    const [patrols, incidents] = await Promise.all([
      this.prisma.patrolMinute.findMany({
        where: patrolWhere,
        select: { latitude: true, longitude: true, patrolType: true, createdAt: true },
        take: 500,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.incident.findMany({
        where: incidentWhere,
        select: { latitude: true, longitude: true, tipoDelito: true, createdAt: true },
        take: 500,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { patrols, incidents };
  }

  // ─── CELDAS / CALABOZOS ───────────────────────────────────────────────────

  listDetentionCells(): Promise<unknown[]> {
    return this.prisma.detentionCell.findMany({
      where: { isActive: true },
      orderBy: [{ block: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { detainees: true } },
      },
    });
  }

  createDetentionCell(data: {
    code: string;
    name: string;
    block?: string;
    capacity?: number;
  }): Promise<unknown> {
    return this.prisma.detentionCell.create({
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        block: data.block?.trim(),
        capacity: data.capacity,
      },
    });
  }

  // ─── DETENIDOS ────────────────────────────────────────────────────────────

  listDetainees(filters?: {
    status?: DetaineeStatus;
    convicted?: boolean;
    cellId?: string;
  }): Promise<unknown[]> {
    return this.prisma.detainee.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.convicted !== undefined
          ? { isConvicted: filters.convicted }
          : {}),
        ...(filters?.cellId ? { detentionCellId: filters.cellId } : {}),
      },
      orderBy: { ingresoAt: 'desc' },
      include: DETAINEE_INCLUDE,
    });
  }

  getDetainee(id: string): Promise<unknown> {
    return this.prisma.detainee.findUnique({
      where: { id },
      include: DETAINEE_DETAIL_INCLUDE,
    });
  }

  async createDetainee(
    data: {
      cedula?: string;
      nombres: string;
      apellidos: string;
      alias?: string;
      detentionCellId?: string;
      cellNumber?: string;
      notas?: string;
      delitoInicial?: string;
      officerId?: string;
      incidentId?: string;
      isConvicted?: boolean;
      sentenceYears?: number;
    },
    files?: Record<string, Express.Multer.File[]>,
  ): Promise<unknown> {
    if (data.detentionCellId) {
      const cell = await this.prisma.detentionCell.findUnique({
        where: { id: data.detentionCellId },
      });
      if (!cell?.isActive) {
        throw new BadRequestException('Celda no válida o inactiva');
      }
    }

    const detainee = await this.prisma.detainee.create({
      data: {
        cedula: data.cedula,
        nombres: data.nombres,
        apellidos: data.apellidos,
        alias: data.alias,
        detentionCellId: data.detentionCellId,
        cellNumber: data.cellNumber,
        notas: data.notas,
        isConvicted: data.isConvicted ?? false,
        sentenceYears: data.sentenceYears,
        records: data.delitoInicial || data.incidentId
          ? {
              create: {
                delito: data.delitoInicial ?? 'Vinculado a incidente',
                officerId: data.officerId,
                incidentId: data.incidentId,
              },
            }
          : undefined,
      },
    });

    if (files) {
      await this.persistDetaineePhotos(detainee.id, files);
    }

    return this.getDetainee(detainee.id);
  }

  async updateDetaineeProfile(
    id: string,
    data: {
      isConvicted?: boolean;
      sentenceYears?: number | null;
      detentionCellId?: string | null;
      notas?: string;
    },
  ): Promise<unknown> {
    await this.assertDetaineeMutable(id);

    if (data.detentionCellId) {
      const cell = await this.prisma.detentionCell.findUnique({
        where: { id: data.detentionCellId },
      });
      if (!cell?.isActive) {
        throw new BadRequestException('Celda no válida');
      }
    }

    await this.prisma.detainee.update({
      where: { id },
      data: {
        ...(data.isConvicted !== undefined ? { isConvicted: data.isConvicted } : {}),
        ...(data.sentenceYears !== undefined
          ? { sentenceYears: data.sentenceYears }
          : {}),
        ...(data.detentionCellId !== undefined
          ? { detentionCellId: data.detentionCellId }
          : {}),
        ...(data.notas !== undefined ? { notas: data.notas } : {}),
      },
    });

    return this.getDetainee(id);
  }

  async streamDetaineeFile(filename: string, res: Response): Promise<void> {
    await this.detaineeStorage.ensureStorageReady();
    this.detaineeStorage.assertSafeFilename(filename);

    const photo = await this.prisma.detaineePhoto.findFirst({
      where: { filename },
      select: { id: true },
    });

    if (!photo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const absolutePath = this.detaineeStorage.resolveAbsolutePath(filename);
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    await new Promise<void>((resolve, reject) => {
      createReadStream(absolutePath)
        .on('error', reject)
        .on('end', resolve)
        .pipe(res);
    });
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

    const hasPrimary = await this.prisma.detaineePhoto.findFirst({
      where: { detaineeId, isPrimary: true },
    });

    if (!hasPrimary) {
      const first = await this.prisma.detaineePhoto.findFirst({
        where: { detaineeId },
        orderBy: { createdAt: 'asc' },
      });
      if (first) {
        await this.prisma.detaineePhoto.update({
          where: { id: first.id },
          data: { isPrimary: true },
        });
      }
    }
  }

  addDetaineeHearing(
    detaineeId: string,
    data: {
      fecha: string;
      tribunal: string;
      resultado?: string;
      observaciones?: string;
      isConvicted?: boolean;
      sentenceYears?: number;
    },
  ): Promise<unknown> {
    return this.assertDetaineeMutable(detaineeId).then(async () => {
      await this.prisma.detaineeHearing.create({
        data: {
          detaineeId,
          fecha: new Date(data.fecha),
          tribunal: data.tribunal,
          resultado: data.resultado,
          observaciones: data.observaciones,
        },
      });

      if (data.isConvicted !== undefined || data.sentenceYears !== undefined) {
        await this.prisma.detainee.update({
          where: { id: detaineeId },
          data: {
            ...(data.isConvicted !== undefined
              ? { isConvicted: data.isConvicted }
              : {}),
            ...(data.sentenceYears !== undefined
              ? { sentenceYears: data.sentenceYears }
              : {}),
          },
        });
      }

      return this.getDetainee(detaineeId);
    });
  }

  addDetaineeRecord(
    detaineeId: string,
    data: { delito: string; observaciones?: string; officerId?: string; incidentId?: string },
  ): Promise<unknown> {
    return this.assertDetaineeMutable(detaineeId).then(() =>
      this.prisma.detaineeRecord.create({
        data: { detaineeId, ...data },
      }),
    );
  }

  async updateDetaineeStatus(id: string, status: DetaineeStatus): Promise<unknown> {
    await this.assertDetaineeMutable(id);

    return this.prisma.detainee.update({
      where: { id },
      data: {
        status,
        egresoAt: status === DetaineeStatus.LIBERADO || status === DetaineeStatus.TRASLADADO_FISCALIA
          ? new Date()
          : undefined,
      },
    });
  }

  // ─── GUARDIAS ───────────────────────────────────────────────────────────────

  listShifts(
    actor: AuthenticatedOfficer,
    fecha?: string,
    departmentId?: string,
    activeOnly?: boolean,
  ): Promise<unknown[]> {
    const scopedDept = resolveScopedDepartmentId(actor, departmentId);
    const date = fecha ? new Date(fecha) : new Date();
    const dayStart = new Date(date.toISOString().slice(0, 10));

    return this.prisma.officerShift.findMany({
      where: {
        fecha: dayStart,
        ...(scopedDept ? { departmentId: scopedDept } : {}),
        ...(activeOnly ? { status: ShiftStatus.ON_DUTY_ACTIVE } : {}),
      },
      include: {
        officer: {
          select: {
            id: true,
            cedula: true,
            nombres: true,
            apellidos: true,
            grado: true,
            department: { select: { id: true, name: true, code: true } },
            squad: { select: { name: true, callsign: true } },
          },
        },
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ status: 'desc' }, { horaInicio: 'asc' }],
    });
  }

  createShift(
    data: {
      officerId: string;
      departmentId: string;
      fecha: string;
      horaInicio: string;
      horaFin: string;
    },
    actor: AuthenticatedOfficer,
  ): Promise<unknown> {
    assertDepartmentAccess(actor, data.departmentId);
    return this.prisma.officerShift.create({
      data: {
        ...data,
        fecha: new Date(data.fecha),
        status: ShiftStatus.ON_DUTY_PENDING,
      },
    });
  }

  async checkInShift(
    shiftId: string,
    officerId: string,
    coords?: { latitude?: number; longitude?: number },
  ): Promise<unknown> {
    const shift = await this.prisma.officerShift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.officerId !== officerId) {
      throw new NotFoundException('Guardia no encontrada');
    }

    return this.prisma.officerShift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.ON_DUTY_ACTIVE,
        checkedInAt: new Date(),
        checkInLatitude: coords?.latitude ?? null,
        checkInLongitude: coords?.longitude ?? null,
      },
    });
  }

  async activeRoster(
    actor: AuthenticatedOfficer,
    departmentId?: string,
    fecha?: string,
  ): Promise<unknown[]> {
    const scopedDept = resolveScopedDepartmentId(actor, departmentId);
    const date = fecha ? new Date(fecha) : new Date();
    const dayStart = new Date(date.toISOString().slice(0, 10));

    const shifts = await this.prisma.officerShift.findMany({
      where: {
        fecha: dayStart,
        ...(scopedDept ? { departmentId: scopedDept } : {}),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    const allOfficers = await this.prisma.officer.findMany({
      where: {
        isSuspended: false,
        rangeRole: { in: [RangeRole.OFICIAL_ACTIVO, RangeRole.JEFE_DEPARTAMENTO] },
        ...(scopedDept ? { departmentId: scopedDept } : {}),
      },
      select: {
        id: true,
        cedula: true,
        nombres: true,
        apellidos: true,
        grado: true,
        department: { select: { id: true, name: true, code: true } },
        squad: { select: { name: true, callsign: true } },
      },
    });

    const shiftMap = new Map(shifts.map((s) => [s.officerId, s]));

    return allOfficers.map((officer) => {
      const shift = shiftMap.get(officer.id);
      let dotStatus: 'gris' | 'naranja' | 'verde' = 'gris';
      if (shift) {
        dotStatus =
          shift.status === ShiftStatus.ON_DUTY_ACTIVE
            ? 'verde'
            : shift.status === ShiftStatus.ON_DUTY_PENDING
              ? 'naranja'
              : 'gris';
      }
      return {
        officer,
        shift: shift ?? null,
        dotStatus,
        commandName: shift?.department?.name ?? officer.department.name,
        commandCode: shift?.department?.code ?? officer.department.code,
      };
    });
  }

  // ─── LOGÍSTICA ──────────────────────────────────────────────────────────────

  listInventory(actor: AuthenticatedOfficer, departmentId?: string, turno?: string): Promise<unknown[]> {
    const scopedDept = resolveScopedDepartmentId(actor, departmentId);
    return this.prisma.inventoryAsset.findMany({
      where: {
        ...(scopedDept ? { departmentId: scopedDept } : {}),
        ...(turno ? { turno } : {}),
      },
      orderBy: { assetType: 'asc' },
      include: {
        department: { select: { name: true, code: true } },
        assignedOfficer: {
          select: { id: true, nombres: true, apellidos: true, cedula: true },
        },
      },
    });
  }

  async inventoryByShift(actor: AuthenticatedOfficer, departmentId: string, fecha?: string): Promise<unknown> {
    assertDepartmentAccess(actor, departmentId);
    const day = fecha ? new Date(fecha) : new Date();
    day.setHours(0, 0, 0, 0);

    const [shifts, assets] = await Promise.all([
      this.prisma.officerShift.findMany({
        where: { departmentId, fecha: day },
        orderBy: { horaInicio: 'asc' },
        include: {
          officer: {
            select: { id: true, nombres: true, apellidos: true, grado: true },
          },
        },
      }),
      this.prisma.inventoryAsset.findMany({
        where: { departmentId },
        orderBy: { assetType: 'asc' },
        include: {
          assignedOfficer: {
            select: { id: true, nombres: true, apellidos: true },
          },
        },
      }),
    ]);

    const turnos = [...new Set(shifts.map((s) => `${s.horaInicio}-${s.horaFin}`))];
    const byTurno = turnos.map((turnoLabel) => ({
      turno: turnoLabel,
      officers: shifts
        .filter((s) => `${s.horaInicio}-${s.horaFin}` === turnoLabel)
        .map((s) => s.officer),
      assets: assets.filter((a) => a.turno === turnoLabel),
    }));

    return {
      fecha: day.toISOString().slice(0, 10),
      turnos: byTurno,
      unassigned: assets.filter((a) => !a.turno && !a.assignedOfficerId),
      atCommandPool: assets.filter((a) => !a.assignedOfficerId && a.departmentId),
    };
  }

  async inventorySummary(actor: AuthenticatedOfficer, departmentId?: string): Promise<unknown[]> {
    const scopedDept = resolveScopedDepartmentId(actor, departmentId);
    const rows = await this.prisma.inventoryAsset.groupBy({
      by: ['assetType', 'status'],
      where: scopedDept ? { departmentId: scopedDept } : undefined,
      _count: { id: true },
    });
    return rows;
  }

  createAsset(
    data: {
      code: string;
      name: string;
      assetType: AssetType;
      serialNumber?: string;
      departmentId: string;
      notas?: string;
    },
    actor: AuthenticatedOfficer,
  ): Promise<unknown> {
    if (!data.departmentId?.trim()) {
      throw new BadRequestException('Debe indicar el comando o división del activo');
    }
    assertDepartmentAccess(actor, data.departmentId);
    return this.prisma.inventoryAsset.create({
      data: {
        ...data,
        departmentId: data.departmentId.trim(),
      },
    });
  }

  async assignInventoryAsset(
    assetId: string,
    data: { officerId?: string | null; turno?: string },
    actor: AuthenticatedOfficer,
  ): Promise<unknown> {
    const asset = await this.prisma.inventoryAsset.findUnique({
      where: { id: assetId },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    if (!asset.departmentId) {
      throw new BadRequestException('El activo no pertenece a ningún comando');
    }
    assertDepartmentAccess(actor, asset.departmentId);

    if (asset.assignedOfficerId) {
      throw new BadRequestException(
        'El activo ya está entregado a un funcionario. Registre la devolución al comando antes de reasignar.',
      );
    }

    if (data.officerId) {
      const officer = await this.prisma.officer.findUnique({
        where: { id: data.officerId },
        select: { id: true, departmentId: true, nombres: true, apellidos: true },
      });
      if (!officer) {
        throw new NotFoundException('Funcionario no encontrado');
      }
      if (officer.departmentId !== asset.departmentId) {
        throw new BadRequestException('El funcionario no pertenece al mismo comando del activo');
      }

      return this.prisma.inventoryAsset.update({
        where: { id: assetId },
        data: {
          assignedOfficerId: officer.id,
          turno: data.turno?.trim() || null,
          assignedAt: new Date(),
        },
        include: {
          department: { select: { id: true, name: true, code: true } },
          assignedOfficer: { select: { id: true, nombres: true, apellidos: true } },
        },
      });
    }

    return this.prisma.inventoryAsset.update({
      where: { id: assetId },
      data: {
        assignedOfficerId: null,
        turno: data.turno?.trim() || null,
        assignedAt: null,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        assignedOfficer: { select: { id: true, nombres: true, apellidos: true } },
      },
    });
  }

  async releaseInventoryAsset(assetId: string, actor: AuthenticatedOfficer): Promise<unknown> {
    const asset = await this.prisma.inventoryAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    if (!asset.assignedOfficerId) {
      throw new BadRequestException('El activo ya está en custodia del comando, sin entrega a funcionario.');
    }
    if (asset.departmentId) {
      assertDepartmentAccess(actor, asset.departmentId);
    }

    return this.prisma.inventoryAsset.update({
      where: { id: assetId },
      data: {
        assignedOfficerId: null,
        turno: null,
        assignedAt: null,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        assignedOfficer: { select: { id: true, nombres: true, apellidos: true } },
      },
    });
  }

  getMyShiftToday(officerId: string, fecha?: string): Promise<unknown> {
    const day = fecha ? new Date(fecha) : new Date();
    day.setHours(0, 0, 0, 0);

    return this.prisma.officerShift.findFirst({
      where: { officerId, fecha: day },
      include: {
        department: { select: { id: true, name: true, code: true } },
        officer: { select: { nombres: true, apellidos: true, grado: true } },
      },
    });
  }

  // ─── PARQUE DE ARMAS ───────────────────────────────────────────────────────

  listWeapons(actor: AuthenticatedOfficer, departmentId?: string): Promise<unknown[]> {
    const scopedDept = resolveScopedDepartmentId(actor, departmentId);
    return this.prisma.weapon.findMany({
      where: scopedDept ? { departmentId: scopedDept } : undefined,
      orderBy: { serialNumber: 'asc' },
      include: {
        department: { select: { name: true } },
        assignments: {
          where: { returnedAt: null },
          include: {
            officer: { select: { id: true, nombres: true, apellidos: true, cedula: true, credentialNumber: true } },
          },
          take: 1,
        },
      },
    });
  }

  createWeapon(
    data: {
      serialNumber: string;
      tipo: string;
      marca?: string;
      modelo?: string;
      departmentId?: string;
    },
    actor: AuthenticatedOfficer,
  ): Promise<unknown> {
    if (data.departmentId) {
      assertDepartmentAccess(actor, data.departmentId);
    }
    return this.prisma.weapon.create({
      data: { ...data, status: WeaponStatus.DISPONIBLE },
    });
  }

  async assignWeapon(
    weaponId: string,
    actor: AuthenticatedOfficer,
    data: { officerId: string; turno?: string; observaciones?: string },
  ): Promise<unknown> {
    const weapon = await this.prisma.weapon.findUnique({ where: { id: weaponId } });
    if (!weapon) throw new NotFoundException('Arma no encontrada');
    if (weapon.departmentId) {
      assertDepartmentAccess(actor, weapon.departmentId);
    }

    const active = await this.prisma.weaponAssignment.findFirst({
      where: { weaponId, returnedAt: null },
    });
    if (active) throw new BadRequestException('El arma ya está asignada');

    const [assignment] = await this.prisma.$transaction([
      this.prisma.weaponAssignment.create({
        data: {
          weaponId,
          officerId: data.officerId,
          assignedByOfficerId: actor.id,
          turno: data.turno,
          observaciones: data.observaciones,
        },
      }),
      this.prisma.weapon.update({
        where: { id: weaponId },
        data: { status: WeaponStatus.ASIGNADA },
      }),
    ]);

    return assignment;
  }

  async returnWeapon(assignmentId: string, actor: AuthenticatedOfficer): Promise<{ ok: boolean }> {
    const assignment = await this.prisma.weaponAssignment.findUnique({
      where: { id: assignmentId },
      include: { weapon: { select: { departmentId: true } } },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }
    assertWeaponAssignmentAllowsMutation(assignment.returnedAt);
    if (assignment.weapon.departmentId) {
      assertDepartmentAccess(actor, assignment.weapon.departmentId);
    }

    await this.prisma.$transaction([
      this.prisma.weaponAssignment.update({
        where: { id: assignmentId },
        data: { returnedAt: new Date() },
      }),
      this.prisma.weapon.update({
        where: { id: assignment.weaponId },
        data: { status: WeaponStatus.DISPONIBLE },
      }),
    ]);

    return { ok: true };
  }

  async weaponAssignmentHistory(weaponId: string, actor: AuthenticatedOfficer): Promise<unknown[]> {
    const weapon = await this.prisma.weapon.findUnique({ where: { id: weaponId } });
    if (!weapon) throw new NotFoundException('Arma no encontrada');
    if (weapon.departmentId) {
      assertDepartmentAccess(actor, weapon.departmentId);
    }
    return this.prisma.weaponAssignment.findMany({
      where: { weaponId },
      orderBy: { assignedAt: 'desc' },
      include: {
        officer: { select: { nombres: true, apellidos: true, cedula: true, credentialNumber: true } },
        assignedByOfficer: { select: { nombres: true, apellidos: true } },
      },
    });
  }

  private async assertDetaineeMutable(detaineeId: string): Promise<void> {
    const detainee = await this.prisma.detainee.findUnique({
      where: { id: detaineeId },
      select: { status: true },
    });
    if (!detainee) {
      throw new NotFoundException('Detenido no encontrado');
    }
    assertDetaineeAllowsMutation(detainee.status);
  }
}
