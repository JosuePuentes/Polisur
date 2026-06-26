import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetStatus,
  AssetType,
  DetaineeStatus,
  PatrolType,
  PrismaService,
  RangeRole,
  ShiftStatus,
  WeaponStatus,
} from '@polisur/database';
import { randomBytes } from 'node:crypto';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import {
  assertDepartmentAccess,
  assertPatrolCreateScope,
  resolveScopedDepartmentId,
} from '../common/utils/operational-scope.util';

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

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
      orderBy: { name: 'asc' },
    });
  }

  createQuadrant(data: {
    code: string;
    name: string;
    parroquia: string;
    centerLat?: number;
    centerLng?: number;
  }): Promise<unknown> {
    return this.prisma.peaceQuadrant.create({ data });
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
        createdByOfficer: { select: { id: true, nombres: true, apellidos: true } },
      },
    });
  }

  async createPatrol(
    actor: AuthenticatedOfficer,
    data: {
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
    if (!data.officerIds.length) {
      throw new BadRequestException('Debe incluir al menos un funcionario en la minuta');
    }

    assertPatrolCreateScope(actor, data.departmentId, data.squadId);

    const code = `PAT-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    const officers = await this.prisma.officer.findMany({
      where: { id: { in: data.officerIds } },
      select: { id: true, departmentId: true, squadId: true },
    });

    return this.prisma.patrolMinute.create({
      data: {
        code,
        patrolType: data.patrolType,
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
      },
      include: {
        officers: { include: { officer: true } },
        recoveredObjects: true,
      },
    });
  }

  async addRecoveredObject(
    patrolMinuteId: string,
    data: { description: string; quantity?: number; unit?: string; photoUrl?: string },
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
    return this.prisma.recoveredObject.create({
      data: { patrolMinuteId, ...data, quantity: data.quantity ?? 1 },
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

  // ─── DETENIDOS ────────────────────────────────────────────────────────────

  listDetainees(status?: DetaineeStatus): Promise<unknown[]> {
    return this.prisma.detainee.findMany({
      where: status ? { status } : undefined,
      orderBy: { ingresoAt: 'desc' },
      include: {
        _count: { select: { hearings: true, records: true } },
      },
    });
  }

  getDetainee(id: string): Promise<unknown> {
    return this.prisma.detainee.findUnique({
      where: { id },
      include: {
        hearings: { orderBy: { fecha: 'desc' } },
        records: {
          orderBy: { fecha: 'desc' },
          include: {
            officer: { select: { nombres: true, apellidos: true } },
            incident: { select: { id: true, code: true, tipoDelito: true } },
          },
        },
      },
    });
  }

  createDetainee(data: {
    cedula?: string;
    nombres: string;
    apellidos: string;
    alias?: string;
    cellNumber?: string;
    notas?: string;
    delitoInicial?: string;
    officerId?: string;
    incidentId?: string;
  }): Promise<unknown> {
    return this.prisma.detainee.create({
      data: {
        cedula: data.cedula,
        nombres: data.nombres,
        apellidos: data.apellidos,
        alias: data.alias,
        cellNumber: data.cellNumber,
        notas: data.notas,
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
      include: { records: true },
    });
  }

  addDetaineeHearing(
    detaineeId: string,
    data: { fecha: string; tribunal: string; resultado?: string; observaciones?: string },
  ): Promise<unknown> {
    return this.prisma.detaineeHearing.create({
      data: {
        detaineeId,
        fecha: new Date(data.fecha),
        tribunal: data.tribunal,
        resultado: data.resultado,
        observaciones: data.observaciones,
      },
    });
  }

  addDetaineeRecord(
    detaineeId: string,
    data: { delito: string; observaciones?: string; officerId?: string; incidentId?: string },
  ): Promise<unknown> {
    return this.prisma.detaineeRecord.create({
      data: { detaineeId, ...data },
    });
  }

  updateDetaineeStatus(id: string, status: DetaineeStatus): Promise<unknown> {
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

  listShifts(actor: AuthenticatedOfficer, fecha?: string, departmentId?: string): Promise<unknown[]> {
    const scopedDept = resolveScopedDepartmentId(actor, departmentId);
    const date = fecha ? new Date(fecha) : new Date();
    const dayStart = new Date(date.toISOString().slice(0, 10));

    return this.prisma.officerShift.findMany({
      where: {
        fecha: dayStart,
        ...(scopedDept ? { departmentId: scopedDept } : {}),
      },
      include: {
        officer: {
          select: {
            id: true,
            cedula: true,
            nombres: true,
            apellidos: true,
            grado: true,
            squad: { select: { name: true } },
          },
        },
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { horaInicio: 'asc' },
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

  async activeRoster(actor: AuthenticatedOfficer, departmentId?: string): Promise<unknown[]> {
    const scopedDept = resolveScopedDepartmentId(actor, departmentId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shifts = await this.prisma.officerShift.findMany({
      where: {
        fecha: today,
        ...(scopedDept ? { departmentId: scopedDept } : {}),
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
        department: { select: { name: true } },
        squad: { select: { name: true } },
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
      return { officer, shift: shift ?? null, dotStatus };
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

    return { fecha: day.toISOString().slice(0, 10), turnos: byTurno, unassigned: assets.filter((a) => !a.turno) };
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
      departmentId?: string;
      notas?: string;
    },
    actor: AuthenticatedOfficer,
  ): Promise<unknown> {
    if (data.departmentId) {
      assertDepartmentAccess(actor, data.departmentId);
    }
    return this.prisma.inventoryAsset.create({ data });
  }

  async assignInventoryAsset(
    assetId: string,
    data: { officerId: string; turno: string },
    actor: AuthenticatedOfficer,
  ): Promise<unknown> {
    const asset = await this.prisma.inventoryAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    if (asset.departmentId) {
      assertDepartmentAccess(actor, asset.departmentId);
    }

    return this.prisma.inventoryAsset.update({
      where: { id: assetId },
      data: {
        assignedOfficerId: data.officerId,
        turno: data.turno,
        assignedAt: new Date(),
      },
      include: {
        assignedOfficer: { select: { nombres: true, apellidos: true } },
      },
    });
  }

  async releaseInventoryAsset(assetId: string, actor: AuthenticatedOfficer): Promise<unknown> {
    const asset = await this.prisma.inventoryAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
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
            officer: { select: { id: true, nombres: true, apellidos: true, cedula: true } },
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
    if (!assignment || assignment.returnedAt) {
      throw new NotFoundException('Asignación no encontrada');
    }
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
        officer: { select: { nombres: true, apellidos: true, cedula: true } },
        assignedByOfficer: { select: { nombres: true, apellidos: true } },
      },
    });
  }
}
