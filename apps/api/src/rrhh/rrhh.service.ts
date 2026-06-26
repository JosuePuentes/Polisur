import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ALL_SITOP_PERMISSIONS,
  Prisma,
  PrismaService,
  RangeRole,
  resolveOfficerPermissions,
} from '@polisur/database';
import * as bcrypt from 'bcrypt';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateOfficerDto } from './dto/create-officer.dto';
import { CreateSquadDto } from './dto/create-squad.dto';
import { SetOfficerCredentialsDto } from './dto/set-officer-credentials.dto';
import { UpdateOfficerDto } from './dto/update-officer.dto';
import { UpdateOfficerPermissionsDto } from './dto/update-officer-permissions.dto';

const BCRYPT_ROUNDS = 12;

const OFFICER_LIST_SELECT = {
  id: true,
  cedula: true,
  nombres: true,
  apellidos: true,
  rangeRole: true,
  credentialNumber: true,
  telefono: true,
  email: true,
  fechaNacimiento: true,
  direccion: true,
  grado: true,
  fechaIngreso: true,
  permissions: true,
  isSuspended: true,
  departmentId: true,
  squadId: true,
  promocionId: true,
  passwordHash: true,
  createdAt: true,
  department: { select: { id: true, code: true, name: true } },
  squad: { select: { id: true, name: true, callsign: true } },
} satisfies Prisma.OfficerSelect;

export type OfficerListItem = Omit<
  Prisma.OfficerGetPayload<{ select: typeof OFFICER_LIST_SELECT }>,
  'passwordHash'
> & {
  hasCredentials: boolean;
  effectivePermissions: string[];
};

@Injectable()
export class RrhhService {
  constructor(private readonly prisma: PrismaService) {}

  async searchOfficers(query?: string): Promise<OfficerListItem[]> {
    const normalized = query?.trim();

    const officers = await this.prisma.officer.findMany({
      where: normalized
        ? {
            OR: [
              { cedula: { contains: normalized, mode: 'insensitive' } },
              { nombres: { contains: normalized, mode: 'insensitive' } },
              { apellidos: { contains: normalized, mode: 'insensitive' } },
              { credentialNumber: { contains: normalized, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: OFFICER_LIST_SELECT,
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
      take: 50,
    });

    return officers.map((officer) => this.toListItem(officer));
  }

  async findOfficer(id: string): Promise<OfficerListItem> {
    const officer = await this.prisma.officer.findUnique({
      where: { id },
      select: OFFICER_LIST_SELECT,
    });

    if (!officer) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    return this.toListItem(officer);
  }

  async getCatalogs(): Promise<{
    departments: Array<{
      id: string;
      code: string;
      name: string;
      squads: Array<{ id: string; name: string; callsign: string | null }>;
    }>;
    promociones: Array<{ id: string; nombreCurso: string }>;
    permissionCatalog: typeof ALL_SITOP_PERMISSIONS;
  }> {
    const [departments, promociones] = await Promise.all([
      this.prisma.department.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          squads: {
            where: { isActive: true },
            select: { id: true, name: true, callsign: true },
            orderBy: { name: 'asc' },
          },
        },
      }),
      this.prisma.promocion.findMany({
        orderBy: { fechaInicio: 'desc' },
        select: { id: true, nombreCurso: true },
      }),
    ]);

    return {
      departments,
      promociones,
      permissionCatalog: ALL_SITOP_PERMISSIONS,
    };
  }

  async createOfficer(dto: CreateOfficerDto): Promise<OfficerListItem> {
    await this.assertUniqueOfficer(dto.cedula, dto.credentialNumber);

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
      : null;

    const officer = await this.prisma.officer.create({
      data: {
        cedula: dto.cedula.trim(),
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        rangeRole: dto.rangeRole,
        credentialNumber: dto.credentialNumber.trim(),
        departmentId: dto.departmentId,
        squadId: dto.squadId ?? null,
        promocionId:
          dto.rangeRole === RangeRole.DISCENTE ? (dto.promocionId ?? null) : null,
        telefono: dto.telefono?.trim() ?? null,
        email: dto.email?.trim() ?? null,
        fechaNacimiento: dto.fechaNacimiento
          ? new Date(dto.fechaNacimiento)
          : null,
        direccion: dto.direccion?.trim() ?? null,
        grado: dto.grado?.trim() ?? null,
        fechaIngreso: dto.fechaIngreso ? new Date(dto.fechaIngreso) : null,
        passwordHash,
        permissions: dto.permissions ?? [],
      },
      select: OFFICER_LIST_SELECT,
    });

    return this.toListItem(officer);
  }

  async updateOfficer(id: string, dto: UpdateOfficerDto): Promise<OfficerListItem> {
    const existing = await this.prisma.officer.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    if (dto.cedula || dto.credentialNumber) {
      await this.assertUniqueOfficer(
        dto.cedula ?? existing.cedula,
        dto.credentialNumber ?? existing.credentialNumber,
        id,
      );
    }

    const officer = await this.prisma.officer.update({
      where: { id },
      data: {
        ...(dto.cedula !== undefined ? { cedula: dto.cedula.trim() } : {}),
        ...(dto.nombres !== undefined ? { nombres: dto.nombres.trim() } : {}),
        ...(dto.apellidos !== undefined ? { apellidos: dto.apellidos.trim() } : {}),
        ...(dto.rangeRole !== undefined ? { rangeRole: dto.rangeRole } : {}),
        ...(dto.credentialNumber !== undefined
          ? { credentialNumber: dto.credentialNumber.trim() }
          : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        ...(dto.squadId !== undefined ? { squadId: dto.squadId ?? null } : {}),
        ...(dto.promocionId !== undefined ? { promocionId: dto.promocionId ?? null } : {}),
        ...(dto.telefono !== undefined ? { telefono: dto.telefono?.trim() ?? null } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim() ?? null } : {}),
        ...(dto.fechaNacimiento !== undefined
          ? {
              fechaNacimiento: dto.fechaNacimiento
                ? new Date(dto.fechaNacimiento)
                : null,
            }
          : {}),
        ...(dto.direccion !== undefined ? { direccion: dto.direccion?.trim() ?? null } : {}),
        ...(dto.grado !== undefined ? { grado: dto.grado?.trim() ?? null } : {}),
        ...(dto.fechaIngreso !== undefined
          ? {
              fechaIngreso: dto.fechaIngreso
                ? new Date(dto.fechaIngreso)
                : null,
            }
          : {}),
        ...(dto.permissions !== undefined ? { permissions: dto.permissions } : {}),
        ...(dto.password
          ? { passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS) }
          : {}),
      },
      select: OFFICER_LIST_SELECT,
    });

    return this.toListItem(officer);
  }

  async setCredentials(
    id: string,
    dto: SetOfficerCredentialsDto,
  ): Promise<OfficerListItem> {
    const existing = await this.prisma.officer.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    const officer = await this.prisma.officer.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      },
      select: OFFICER_LIST_SELECT,
    });

    return this.toListItem(officer);
  }

  async createDepartment(dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
      },
      select: { id: true, code: true, name: true },
    });
  }

  async createSquad(dto: CreateSquadDto) {
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });

    if (!department) {
      throw new NotFoundException('Departamento no encontrado');
    }

    return this.prisma.squad.create({
      data: {
        departmentId: dto.departmentId,
        name: dto.name.trim(),
        callsign: dto.callsign?.trim() ?? null,
      },
      select: { id: true, name: true, callsign: true, departmentId: true },
    });
  }

  async setSquadLeader(squadId: string, leaderId: string | null) {
    const squad = await this.prisma.squad.findUnique({ where: { id: squadId } });
    if (!squad) {
      throw new NotFoundException('Escuadra no encontrada');
    }

    if (leaderId) {
      const officer = await this.prisma.officer.findUnique({ where: { id: leaderId } });
      if (!officer || officer.departmentId !== squad.departmentId) {
        throw new BadRequestException(
          'El funcionario debe pertenecer al mismo comando que la escuadra',
        );
      }

      await this.prisma.squad.updateMany({
        where: { leaderId },
        data: { leaderId: null },
      });
    }

    return this.prisma.squad.update({
      where: { id: squadId },
      data: { leaderId },
      select: {
        id: true,
        name: true,
        callsign: true,
        leaderId: true,
        leader: { select: { id: true, nombres: true, apellidos: true } },
      },
    });
  }

  async transferOfficer(
    id: string,
    data: { departmentId: string; squadId?: string | null },
  ): Promise<OfficerListItem> {
    const existing = await this.prisma.officer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    const officer = await this.prisma.officer.update({
      where: { id },
      data: {
        departmentId: data.departmentId,
        squadId: data.squadId ?? null,
      },
      select: OFFICER_LIST_SELECT,
    });

    return this.toListItem(officer);
  }

  async listPendingGraduates(): Promise<OfficerListItem[]> {
    const academyDept = await this.prisma.department.findFirst({
      where: { code: 'DECT', isActive: true },
      select: { id: true },
    });

    if (!academyDept) return [];

    const officers = await this.prisma.officer.findMany({
      where: {
        rangeRole: RangeRole.OFICIAL_ACTIVO,
        departmentId: academyDept.id,
        squadId: null,
        isSuspended: false,
      },
      select: OFFICER_LIST_SELECT,
      orderBy: [{ updatedAt: 'desc' }, { apellidos: 'asc' }],
    });

    return officers.map((officer) => this.toListItem(officer));
  }

  async updatePermissions(
    id: string,
    dto: UpdateOfficerPermissionsDto,
  ): Promise<OfficerListItem> {
    const existing = await this.prisma.officer.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    const officer = await this.prisma.officer.update({
      where: { id },
      data: { permissions: dto.permissions },
      select: OFFICER_LIST_SELECT,
    });

    return this.toListItem(officer);
  }

  private async assertUniqueOfficer(
    cedula: string,
    credentialNumber: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.prisma.officer.findFirst({
      where: {
        OR: [{ cedula: cedula.trim() }, { credentialNumber: credentialNumber.trim() }],
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true, cedula: true, credentialNumber: true },
    });

    if (conflict) {
      throw new ConflictException(
        'Ya existe un funcionario con la misma cédula o número de credencial',
      );
    }
  }

  private toListItem(
    officer: Prisma.OfficerGetPayload<{ select: typeof OFFICER_LIST_SELECT }>,
  ): OfficerListItem {
    const { passwordHash, ...safe } = officer;

    return {
      ...safe,
      hasCredentials: Boolean(passwordHash),
      effectivePermissions: resolveOfficerPermissions({
        rangeRole: officer.rangeRole,
        permissions: officer.permissions,
      }),
    };
  }
}
