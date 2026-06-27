import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService, RangeRole } from '@polisur/database';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { resolveScopedDepartmentId } from '../common/utils/operational-scope.util';
import { cedulaMatches, normalizeRegistryQuery, plateMatches } from './registry.utils';

export type RegistryHitSource =
  | 'detenido'
  | 'funcionario'
  | 'discente'
  | 'minuta'
  | 'denuncia'
  | 'objeto_recuperado'
  | 'vehiculo_minuta'
  | 'inventario';

export interface RegistryHit {
  source: RegistryHitSource;
  id: string;
  code: string | null;
  title: string;
  summary: string;
  matchedOn: 'cedula' | 'placa' | 'serial';
  matchedValue: string;
  occurredAt: string;
  departmentName: string | null;
}

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  AUTO: 'Automóvil',
  MOTO: 'Motocicleta',
  CAMIONETA: 'Camioneta',
  CAMION: 'Camión',
  BICICLETA: 'Bicicleta',
  OTRO: 'Otro',
};

@Injectable()
export class RegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async search(actor: AuthenticatedOfficer, q: string): Promise<{ query: string; hits: RegistryHit[] }> {
    const { trimmed, digits, plate } = normalizeRegistryQuery(q);

    if (trimmed.length < 3) {
      throw new BadRequestException('Ingrese al menos 3 caracteres para buscar cédula o matrícula');
    }

    const scopedDept = resolveScopedDepartmentId(actor);
    const isMaster = actor.rangeRole === RangeRole.SUPER_ADMIN;
    const deptFilter = scopedDept && !isMaster ? { departmentId: scopedDept } : undefined;

    const hits: RegistryHit[] = [];

    const vehicleOrConditions = [
      ...(plate.length >= 3 ? [{ plate: { contains: plate, mode: 'insensitive' as const } }] : []),
      ...(digits.length >= 5
        ? [{ ownerCedula: { contains: digits, mode: 'insensitive' as const } }]
        : []),
    ];

    const incidentOrConditions = [
      ...(digits.length >= 5
        ? [{ subjectCedula: { contains: digits, mode: 'insensitive' as const } }]
        : []),
      ...(plate.length >= 3
        ? [{ vehiclePlate: { contains: plate, mode: 'insensitive' as const } }]
        : []),
    ];

    const recoveredOrConditions = [
      ...(plate.length >= 3
        ? [{ identifier: { contains: plate, mode: 'insensitive' as const } }]
        : []),
      ...(digits.length >= 5
        ? [{ identifier: { contains: digits, mode: 'insensitive' as const } }]
        : []),
    ];

    const inventoryOrConditions =
      plate.length >= 3
        ? [
            { plate: { contains: plate, mode: 'insensitive' as const } },
            { serialNumber: { contains: plate, mode: 'insensitive' as const } },
            { code: { contains: plate, mode: 'insensitive' as const } },
          ]
        : [];

    const [
      detainees,
      officers,
      minuteVehicles,
      incidents,
      recoveredObjects,
      inventoryAssets,
    ] = await Promise.all([
      digits.length >= 5
        ? this.prisma.detainee.findMany({
            where: { cedula: { contains: digits, mode: 'insensitive' } },
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
              detentionCell: { select: { name: true } },
              procedure: { select: { department: { select: { name: true } } } },
            },
          })
        : Promise.resolve([]),
      digits.length >= 5
        ? this.prisma.officer.findMany({
            where: {
              OR: [
                { cedula: { contains: digits, mode: 'insensitive' } },
                { cedula: { contains: trimmed, mode: 'insensitive' } },
              ],
            },
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
              department: { select: { name: true } },
              promocion: { select: { nombreCurso: true } },
            },
          })
        : Promise.resolve([]),
      vehicleOrConditions.length
        ? this.prisma.patrolMinuteVehicle.findMany({
            where: {
              ...(deptFilter
                ? { patrolMinute: { departmentId: deptFilter.departmentId } }
                : {}),
              OR: vehicleOrConditions,
            },
            take: 30,
            orderBy: { createdAt: 'desc' },
            include: {
              patrolMinute: {
                select: {
                  id: true,
                  code: true,
                  minuteRole: true,
                  parroquia: true,
                  cuadrante: true,
                  createdAt: true,
                  department: { select: { name: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      incidentOrConditions.length
        ? this.prisma.incident.findMany({
            where: {
              ...deptFilter,
              OR: incidentOrConditions,
            },
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: { department: { select: { name: true } } },
          })
        : Promise.resolve([]),
      recoveredOrConditions.length
        ? this.prisma.recoveredObject.findMany({
            where: {
              OR: recoveredOrConditions,
              ...(deptFilter
                ? { patrolMinute: { departmentId: deptFilter.departmentId } }
                : {}),
            },
            take: 20,
            orderBy: { registeredAt: 'desc' },
            include: {
              patrolMinute: {
                select: {
                  code: true,
                  department: { select: { name: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      inventoryOrConditions.length
        ? this.prisma.inventoryAsset.findMany({
            where: {
              ...(deptFilter ? { departmentId: deptFilter.departmentId } : {}),
              OR: inventoryOrConditions,
            },
            take: 15,
            orderBy: { createdAt: 'desc' },
            include: { department: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);

    for (const detainee of detainees) {
      if (!cedulaMatches(detainee.cedula, digits)) continue;
      hits.push({
        source: 'detenido',
        id: detainee.id,
        code: null,
        title: `${detainee.nombres} ${detainee.apellidos}`,
        summary: `Estado: ${detainee.status}${detainee.detentionCell ? ` · Celda ${detainee.detentionCell.name}` : ''}`,
        matchedOn: 'cedula',
        matchedValue: detainee.cedula ?? trimmed,
        occurredAt: detainee.ingresoAt.toISOString(),
        departmentName: detainee.procedure?.department.name ?? null,
      });
    }

    for (const officer of officers) {
      if (!cedulaMatches(officer.cedula, digits) && !cedulaMatches(officer.cedula, trimmed.replace(/\D/g, ''))) {
        continue;
      }
      const isDiscente = officer.rangeRole === RangeRole.DISCENTE;
      hits.push({
        source: isDiscente ? 'discente' : 'funcionario',
        id: officer.id,
        code: officer.credentialNumber ?? null,
        title: `${officer.nombres} ${officer.apellidos}`,
        summary: isDiscente
          ? `Aspirante · ${officer.promocion?.nombreCurso ?? 'Sin cohorte'}`
          : `${officer.grado ?? 'Funcionario'} · ${officer.department?.name ?? 'Sin comando'}`,
        matchedOn: 'cedula',
        matchedValue: officer.cedula,
        occurredAt: officer.createdAt.toISOString(),
        departmentName: officer.department?.name ?? null,
      });
    }

    for (const vehicle of minuteVehicles) {
      const minute = vehicle.patrolMinute;
      const matchedOnPlate = plateMatches(vehicle.plate, plate);
      const matchedOnCedula = cedulaMatches(vehicle.ownerCedula, digits);
      if (!matchedOnPlate && !matchedOnCedula) continue;

      hits.push({
        source: 'vehiculo_minuta',
        id: vehicle.id,
        code: minute.code,
        title: `${vehicle.plate} · ${VEHICLE_TYPE_LABEL[vehicle.vehicleType] ?? vehicle.vehicleType}`,
        summary: `Minuta ${minute.minuteRole} · ${minute.parroquia} · ${minute.cuadrante}${
          vehicle.ownerCedula ? ` · Titular ${vehicle.ownerCedula}` : ''
        }`,
        matchedOn: matchedOnPlate ? 'placa' : 'cedula',
        matchedValue: matchedOnPlate ? vehicle.plate : (vehicle.ownerCedula ?? trimmed),
        occurredAt: minute.createdAt.toISOString(),
        departmentName: minute.department.name,
      });

      hits.push({
        source: 'minuta',
        id: minute.id,
        code: minute.code,
        title: `Minuta ${minute.minuteRole} ${minute.code}`,
        summary: `${minute.parroquia} · ${minute.cuadrante} · Vehículo ${vehicle.plate}`,
        matchedOn: matchedOnPlate ? 'placa' : 'cedula',
        matchedValue: matchedOnPlate ? vehicle.plate : (vehicle.ownerCedula ?? trimmed),
        occurredAt: minute.createdAt.toISOString(),
        departmentName: minute.department.name,
      });
    }

    for (const incident of incidents) {
      const matchedCedula = cedulaMatches(incident.subjectCedula, digits);
      const matchedPlate = plateMatches(incident.vehiclePlate, plate);
      if (!matchedCedula && !matchedPlate) continue;

      hits.push({
        source: 'denuncia',
        id: incident.id,
        code: incident.code,
        title: `${incident.code} · ${incident.tipoDelito}`,
        summary: `${incident.parroquia} · ${incident.cuadrante} · ${incident.origen}${
          incident.vehiclePlate
            ? ` · Vehículo ${incident.vehiclePlate}`
            : incident.subjectCedula
              ? ` · Cédula ${incident.subjectCedula}`
              : ''
        }`,
        matchedOn: matchedPlate ? 'placa' : 'cedula',
        matchedValue: matchedPlate
          ? (incident.vehiclePlate ?? trimmed)
          : (incident.subjectCedula ?? trimmed),
        occurredAt: incident.createdAt.toISOString(),
        departmentName: incident.department.name,
      });
    }

    for (const object of recoveredObjects) {
      if (!object.identifier) continue;
      const matched =
        plateMatches(object.identifier, plate) || cedulaMatches(object.identifier, digits);
      if (!matched) continue;

      hits.push({
        source: 'objeto_recuperado',
        id: object.id,
        code: object.patrolMinute?.code ?? null,
        title: object.description,
        summary: `Identificador: ${object.identifier}${
          object.patrolMinute ? ` · Minuta ${object.patrolMinute.code}` : ''
        }`,
        matchedOn: 'serial',
        matchedValue: object.identifier,
        occurredAt: object.registeredAt.toISOString(),
        departmentName: object.patrolMinute?.department.name ?? null,
      });
    }

    for (const asset of inventoryAssets) {
      const matchedPlate = plateMatches(asset.plate, plate);
      const matchedSerial =
        plateMatches(asset.serialNumber, plate) || plateMatches(asset.code, plate);
      if (!matchedPlate && !matchedSerial) continue;

      hits.push({
        source: 'inventario',
        id: asset.id,
        code: asset.code,
        title: `${asset.name} (${asset.assetType})`,
        summary: `${asset.plate ? `Placa ${asset.plate}` : ''}${
          asset.serialNumber ? ` · Serial ${asset.serialNumber}` : ''
        } · ${asset.status}`,
        matchedOn: matchedPlate ? 'placa' : 'serial',
        matchedValue: asset.plate ?? asset.serialNumber ?? asset.code,
        occurredAt: asset.createdAt.toISOString(),
        departmentName: asset.department?.name ?? null,
      });
    }

    const deduped = dedupeHits(hits).slice(0, 40);

    return { query: trimmed, hits: deduped };
  }
}

function dedupeHits(hits: RegistryHit[]): RegistryHit[] {
  const seen = new Set<string>();
  const result: RegistryHit[] = [];
  for (const hit of hits) {
    const key = `${hit.source}:${hit.id}:${hit.matchedOn}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(hit);
  }
  return result;
}
