import { Injectable } from '@nestjs/common';
import {
  AssetStatus,
  AssetType,
  DetaineeStatus,
  IncidentStatus,
  PatrolType,
  Prisma,
  PrismaService,
  RangeRole,
  ShiftStatus,
  WeaponStatus,
} from '@polisur/database';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { resolveScopedDepartmentId } from '../common/utils/operational-scope.util';

const ACADEMY_POOL_CODE = 'DECT';
const DAY_MS = 86_400_000;

export interface AnalyticsOverview {
  generatedAt: string;
  scopeLabel: string;
  scopeDepartmentId: string | null;
  kpis: {
    officersRegistered: number;
    officersActive: number;
    minutasToday: number;
    minutasThisMonth: number;
    patrolsToday: number;
    activeWeapons: number;
    activePatrolAssets: number;
    detaineesToday: number;
    detaineesThisMonth: number;
    detaineesInCustody: number;
    incidentsOpen: number;
    shiftsActiveToday: number;
  };
  minutasByDay: Array<{
    date: string;
    total: number;
    minuta: number;
    patrullaje: number;
    mixto: number;
  }>;
  minutasByMonth: Array<{ month: string; label: string; total: number }>;
  detaineesByDay: Array<{ date: string; total: number }>;
  detaineesByMonth: Array<{ month: string; label: string; total: number }>;
  proceduresByType: Array<{ type: string; label: string; count: number }>;
  incidentsByStatus: Array<{ status: string; label: string; count: number }>;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    actor: AuthenticatedOfficer,
    requestedDepartmentId?: string,
  ): Promise<AnalyticsOverview> {
    const scopeDepartmentId = resolveScopedDepartmentId(actor, requestedDepartmentId);
    const scopeLabel = await this.resolveScopeLabel(actor, scopeDepartmentId);
    const now = new Date();
    const startOfToday = startOfLocalDay(now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const seriesSince = new Date(startOfToday);
    seriesSince.setDate(seriesSince.getDate() - 29);

    const officerBase = this.officerScopeWhere(scopeDepartmentId);
    const patrolDept = scopeDepartmentId ? { departmentId: scopeDepartmentId } : {};
    const incidentDept = scopeDepartmentId ? { departmentId: scopeDepartmentId } : {};
    const inventoryDept = scopeDepartmentId ? { departmentId: scopeDepartmentId } : {};
    const weaponDept = scopeDepartmentId ? { departmentId: scopeDepartmentId } : {};
    const shiftDept = scopeDepartmentId ? { departmentId: scopeDepartmentId } : {};

    const [
      officersRegistered,
      officersActive,
      minutasToday,
      minutasThisMonth,
      patrolsToday,
      activeWeapons,
      activePatrolAssets,
      detaineesToday,
      detaineesThisMonth,
      detaineesInCustody,
      incidentsOpen,
      shiftsActiveToday,
      patrolRows,
      detaineeRows,
      procedureGroups,
      incidentGroups,
      departmentName,
    ] = await Promise.all([
      this.prisma.officer.count({ where: officerBase }),
      this.prisma.officer.count({
        where: {
          ...officerBase,
          passwordHash: { not: null },
          isSuspended: false,
        },
      }),
      this.prisma.patrolMinute.count({
        where: {
          ...patrolDept,
          patrolType: PatrolType.MINUTA,
          createdAt: { gte: startOfToday },
        },
      }),
      this.prisma.patrolMinute.count({
        where: {
          ...patrolDept,
          patrolType: PatrolType.MINUTA,
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.patrolMinute.count({
        where: {
          ...patrolDept,
          createdAt: { gte: startOfToday },
        },
      }),
      this.prisma.weaponAssignment.count({
        where: {
          returnedAt: null,
          weapon: {
            status: WeaponStatus.ASIGNADA,
            ...weaponDept,
          },
        },
      }),
      this.prisma.inventoryAsset.count({
        where: {
          ...inventoryDept,
          assetType: AssetType.PATRULLA,
          assignedOfficerId: { not: null },
          status: AssetStatus.OPERATIVO,
        },
      }),
      this.countDetaineeIngress(scopeDepartmentId, startOfToday),
      this.countDetaineeIngress(scopeDepartmentId, startOfMonth),
      this.countDetaineesInCustody(scopeDepartmentId),
      this.prisma.incident.count({
        where: {
          ...incidentDept,
          status: {
            notIn: [IncidentStatus.PROCESADO, IncidentStatus.CERRADO],
          },
        },
      }),
      this.prisma.officerShift.count({
        where: {
          ...shiftDept,
          fecha: startOfToday,
          status: ShiftStatus.ON_DUTY_ACTIVE,
        },
      }),
      this.prisma.patrolMinute.findMany({
        where: {
          ...patrolDept,
          createdAt: { gte: seriesSince },
        },
        select: { createdAt: true, patrolType: true },
      }),
      this.findDetaineeIngressRows(scopeDepartmentId, seriesSince),
      this.prisma.patrolMinute.groupBy({
        by: ['patrolType'],
        where: {
          ...patrolDept,
          createdAt: { gte: startOfMonth },
        },
        _count: { _all: true },
      }),
      this.prisma.incident.groupBy({
        by: ['status'],
        where: incidentDept,
        _count: { _all: true },
      }),
      scopeDepartmentId
        ? this.prisma.department.findUnique({
            where: { id: scopeDepartmentId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

    return {
      generatedAt: now.toISOString(),
      scopeLabel:
        scopeDepartmentId && departmentName?.name
          ? departmentName.name
          : scopeLabel,
      scopeDepartmentId: scopeDepartmentId ?? null,
      kpis: {
        officersRegistered,
        officersActive,
        minutasToday,
        minutasThisMonth,
        patrolsToday,
        activeWeapons,
        activePatrolAssets,
        detaineesToday,
        detaineesThisMonth,
        detaineesInCustody,
        incidentsOpen,
        shiftsActiveToday,
      },
      minutasByDay: buildPatrolDaySeries(patrolRows, seriesSince, 30),
      minutasByMonth: buildPatrolMonthSeries(patrolRows),
      detaineesByDay: buildIngressDaySeries(detaineeRows, seriesSince, 30),
      detaineesByMonth: buildIngressMonthSeries(detaineeRows),
      proceduresByType: procedureGroups.map((row) => ({
        type: row.patrolType,
        label: patrolTypeLabel(row.patrolType),
        count: row._count._all,
      })),
      incidentsByStatus: incidentGroups.map((row) => ({
        status: row.status,
        label: incidentStatusLabel(row.status),
        count: row._count._all,
      })),
    };
  }

  private officerScopeWhere(
    scopeDepartmentId?: string,
  ): Prisma.OfficerWhereInput {
    return {
      rangeRole: { not: RangeRole.DISCENTE },
      department: { code: { not: ACADEMY_POOL_CODE } },
      ...(scopeDepartmentId ? { departmentId: scopeDepartmentId } : {}),
    };
  }

  private async resolveScopeLabel(
    actor: AuthenticatedOfficer,
    scopeDepartmentId?: string,
  ): Promise<string> {
    if (scopeDepartmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: scopeDepartmentId },
        select: { name: true },
      });
      return dept?.name ?? 'Comando operativo';
    }

    if (actor.rangeRole === RangeRole.SUPER_ADMIN) {
      return 'Institución · vista global';
    }

    const dept = await this.prisma.department.findUnique({
      where: { id: actor.departmentId },
      select: { name: true },
    });
    return dept?.name ?? 'Comando operativo';
  }

  private async countDetaineeIngress(
    scopeDepartmentId: string | undefined,
    since: Date,
  ): Promise<number> {
    if (!scopeDepartmentId) {
      return this.prisma.detainee.count({
        where: { ingresoAt: { gte: since } },
      });
    }

    return this.prisma.detainee.count({
      where: {
        ingresoAt: { gte: since },
        records: {
          some: {
            officer: { departmentId: scopeDepartmentId },
          },
        },
      },
    });
  }

  private async countDetaineesInCustody(
    scopeDepartmentId: string | undefined,
  ): Promise<number> {
    if (!scopeDepartmentId) {
      return this.prisma.detainee.count({
        where: { status: DetaineeStatus.EN_CALABOZO },
      });
    }

    return this.prisma.detainee.count({
      where: {
        status: DetaineeStatus.EN_CALABOZO,
        records: {
          some: { officer: { departmentId: scopeDepartmentId } },
        },
      },
    });
  }

  private async findDetaineeIngressRows(
    scopeDepartmentId: string | undefined,
    since: Date,
  ): Promise<Array<{ ingresoAt: Date }>> {
    if (!scopeDepartmentId) {
      return this.prisma.detainee.findMany({
        where: { ingresoAt: { gte: since } },
        select: { ingresoAt: true },
      });
    }

    return this.prisma.detainee.findMany({
      where: {
        ingresoAt: { gte: since },
        records: {
          some: { officer: { departmentId: scopeDepartmentId } },
        },
      },
      select: { ingresoAt: true },
    });
  }
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const labels = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];
  return `${labels[Number(month) - 1]} ${year}`;
}

function buildPatrolDaySeries(
  rows: Array<{ createdAt: Date; patrolType: PatrolType }>,
  since: Date,
  days: number,
) {
  const buckets = new Map<
    string,
    { total: number; minuta: number; patrullaje: number; mixto: number }
  >();

  for (let i = 0; i < days; i += 1) {
    const day = new Date(since.getTime() + i * DAY_MS);
    buckets.set(dateKey(day), { total: 0, minuta: 0, patrullaje: 0, mixto: 0 });
  }

  for (const row of rows) {
    const key = dateKey(row.createdAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    if (row.patrolType === PatrolType.MINUTA) bucket.minuta += 1;
    else if (row.patrolType === PatrolType.PATRULLAJE) bucket.patrullaje += 1;
    else bucket.mixto += 1;
  }

  return Array.from(buckets.entries()).map(([date, values]) => ({
    date,
    ...values,
  }));
}

function buildPatrolMonthSeries(
  rows: Array<{ createdAt: Date; patrolType: PatrolType }>,
) {
  const buckets = new Map<string, number>();
  const now = new Date();

  for (let i = 11; i >= 0; i -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(monthKey(month), 0);
  }

  for (const row of rows) {
    const key = monthKey(row.createdAt);
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([month, total]) => ({
    month,
    label: monthLabel(month),
    total,
  }));
}

function buildIngressDaySeries(
  rows: Array<{ ingresoAt: Date }>,
  since: Date,
  days: number,
) {
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const day = new Date(since.getTime() + i * DAY_MS);
    buckets.set(dateKey(day), 0);
  }
  for (const row of rows) {
    const key = dateKey(row.ingresoAt);
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, total]) => ({ date, total }));
}

function buildIngressMonthSeries(rows: Array<{ ingresoAt: Date }>) {
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(monthKey(month), 0);
  }
  for (const row of rows) {
    const key = monthKey(row.ingresoAt);
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([month, total]) => ({
    month,
    label: monthLabel(month),
    total,
  }));
}

function patrolTypeLabel(type: PatrolType): string {
  switch (type) {
    case PatrolType.MINUTA:
      return 'Minutas';
    case PatrolType.PATRULLAJE:
      return 'Patrullajes';
    default:
      return 'Procedimientos mixtos';
  }
}

function incidentStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}
