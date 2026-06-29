import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ALL_SITOP_PERMISSIONS,
  DivisionRole,
  Prisma,
  PrismaService,
  RangeRole,
  ROLE_DEFAULT_PERMISSIONS,
  SITOP_PERMISSIONS,
  SitopPermission,
  resolveOfficerPermissions,
} from '@polisur/database';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { ActivateOfficerAccountDto } from './dto/activate-officer-account.dto';
import { AssignOfficerCommandDto } from './dto/assign-officer-command.dto';
import { CreateOfficerDto } from './dto/create-officer.dto';
import { CreateOfficerProfileDto } from './dto/create-officer-profile.dto';
import { CreateSquadDto } from './dto/create-squad.dto';
import { SetOfficerCredentialsDto } from './dto/set-officer-credentials.dto';
import { UpdateOfficerDto } from './dto/update-officer.dto';
import { UpdateOfficerPermissionsDto } from './dto/update-officer-permissions.dto';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import {
  assertDepartmentAccess,
  assertOfficerDepartmentAccess,
  assertSuperAdmin,
  resolveScopedDepartmentId,
} from '../common/utils/operational-scope.util';
import { OfficerStorageService } from './services/officer-storage.service';

const BCRYPT_ROUNDS = 12;
const ACADEMY_POOL_CODE = 'DECT';

const SUB_DIRECTOR_PERMISSIONS: SitopPermission[] = [
  SITOP_PERMISSIONS.ANALYTICS_VIEW,
  SITOP_PERMISSIONS.DASHBOARD_VIEW,
  SITOP_PERMISSIONS.INCIDENTS_VIEW,
  SITOP_PERMISSIONS.INCIDENTS_CREATE,
  SITOP_PERMISSIONS.INCIDENTS_STATUS,
  SITOP_PERMISSIONS.INCIDENTS_EVIDENCE,
  SITOP_PERMISSIONS.RRHH_VIEW,
  SITOP_PERMISSIONS.RRHH_MANAGE,
  SITOP_PERMISSIONS.COMMANDS_VIEW,
  SITOP_PERMISSIONS.PATROL_VIEW,
  SITOP_PERMISSIONS.PATROL_MANAGE,
  SITOP_PERMISSIONS.PROCEDURES_VIEW,
  SITOP_PERMISSIONS.PROCEDURES_MANAGE,
  SITOP_PERMISSIONS.DETAINEES_VIEW,
  SITOP_PERMISSIONS.DETAINEES_MANAGE,
  SITOP_PERMISSIONS.SHIFTS_VIEW,
  SITOP_PERMISSIONS.SHIFTS_MANAGE,
  SITOP_PERMISSIONS.LOGISTICS_VIEW,
  SITOP_PERMISSIONS.LOGISTICS_MANAGE,
  SITOP_PERMISSIONS.ARMORY_VIEW,
  SITOP_PERMISSIONS.ARMORY_MANAGE,
];

const OFFICER_LIST_SELECT = {
  id: true,
  cedula: true,
  nombres: true,
  apellidos: true,
  rangeRole: true,
  divisionRole: true,
  credentialNumber: true,
  profilePhotoFilename: true,
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
  profilePhotoUrl: string | null;
  assignmentLabel: string;
};

@Injectable()
export class RrhhService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly officerStorage: OfficerStorageService,
  ) {}

  async searchOfficers(
    actor: AuthenticatedOfficer,
    query?: string,
  ): Promise<OfficerListItem[]> {
    const normalized = query?.trim();
    const departmentId = resolveScopedDepartmentId(actor);

    const officers = await this.prisma.officer.findMany({
      where: {
        ...(departmentId ? { departmentId } : {}),
        ...(normalized
          ? {
              OR: [
                { cedula: { contains: normalized, mode: 'insensitive' } },
                { nombres: { contains: normalized, mode: 'insensitive' } },
                { apellidos: { contains: normalized, mode: 'insensitive' } },
                { credentialNumber: { contains: normalized, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: OFFICER_LIST_SELECT,
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
      take: 50,
    });

    return officers.map((officer) => this.toListItem(officer));
  }

  async findOfficer(
    actor: AuthenticatedOfficer,
    id: string,
  ): Promise<OfficerListItem> {
    const officer = await this.prisma.officer.findUnique({
      where: { id },
      select: OFFICER_LIST_SELECT,
    });

    if (!officer) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    assertOfficerDepartmentAccess(actor, officer.departmentId);

    return this.toListItem(officer);
  }

  async getCatalogs(actor: AuthenticatedOfficer): Promise<{
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

    const scopedDepartmentId = resolveScopedDepartmentId(actor);

    const filteredDepartments =
      scopedDepartmentId === undefined
        ? departments
        : departments.filter((department) => department.id === scopedDepartmentId);

    return {
      departments: filteredDepartments,
      promociones,
      permissionCatalog: ALL_SITOP_PERMISSIONS,
    };
  }

  async createOfficerProfile(
    actor: AuthenticatedOfficer,
    dto: CreateOfficerProfileDto,
    photo?: Express.Multer.File,
  ): Promise<OfficerListItem> {
    assertSuperAdmin(actor);

    const poolDept = await this.prisma.department.findFirst({
      where: { code: ACADEMY_POOL_CODE, isActive: true },
      select: { id: true },
    });

    if (!poolDept) {
      throw new BadRequestException(
        'No está configurado el departamento base (DECT) para perfiles pendientes',
      );
    }

    const cedula = dto.cedula.trim();
    const credentialNumber = this.buildProfileCredentialNumber(cedula);
    await this.assertUniqueOfficer(cedula, credentialNumber);

    const officer = await this.prisma.officer.create({
      data: {
        cedula,
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        credentialNumber,
        departmentId: poolDept.id,
        rangeRole: RangeRole.OFICIAL_ACTIVO,
        divisionRole: DivisionRole.SIN_ASIGNAR,
        telefono: dto.telefono?.trim() ?? null,
        email: dto.email?.trim() ?? null,
        fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null,
        direccion: dto.direccion?.trim() ?? null,
        grado: dto.grado?.trim() ?? null,
        fechaIngreso: dto.fechaIngreso ? new Date(dto.fechaIngreso) : null,
        permissions: [],
      },
      select: OFFICER_LIST_SELECT,
    });

    if (photo?.buffer) {
      const saved = await this.officerStorage.saveWebp(photo.buffer, officer.id);
      const updated = await this.prisma.officer.update({
        where: { id: officer.id },
        data: { profilePhotoFilename: saved.filename },
        select: OFFICER_LIST_SELECT,
      });
      return this.toListItem(updated);
    }

    return this.toListItem(officer);
  }

  async assignToCommand(
    actor: AuthenticatedOfficer,
    id: string,
    dto: AssignOfficerCommandDto,
  ): Promise<OfficerListItem> {
    const existing = await this.prisma.officer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    if (dto.divisionRole === DivisionRole.SIN_ASIGNAR) {
      throw new BadRequestException('Debe indicar un perfil dentro del comando');
    }

    if (actor.rangeRole !== RangeRole.SUPER_ADMIN) {
      assertDepartmentAccess(actor, dto.departmentId);
    } else {
      assertDepartmentAccess(actor, dto.departmentId);
    }

    if (existing.rangeRole === RangeRole.SUPER_ADMIN) {
      throw new BadRequestException(
        'El Director General no puede reasignarse por este flujo. Use transferencia de comando si aplica.',
      );
    }

    if (dto.squadId) {
      const squad = await this.prisma.squad.findUnique({
        where: { id: dto.squadId },
        select: { departmentId: true },
      });
      if (!squad || squad.departmentId !== dto.departmentId) {
        throw new BadRequestException('La escuadra no pertenece al comando seleccionado');
      }
    }

    const isPendingProfile = existing.divisionRole === DivisionRole.SIN_ASIGNAR;

    const rangeRole =
      dto.divisionRole === DivisionRole.DIRECTOR
        ? RangeRole.JEFE_DEPARTAMENTO
        : RangeRole.OFICIAL_ACTIVO;

    const officer = await this.prisma.$transaction(async (tx) => {
      if (dto.divisionRole === DivisionRole.DIRECTOR) {
        await tx.department.update({
          where: { id: dto.departmentId },
          data: { commanderId: id },
        });
      }

      return tx.officer.update({
        where: { id },
        data: {
          departmentId: dto.departmentId,
          squadId: dto.squadId ?? null,
          divisionRole: dto.divisionRole,
          rangeRole,
          ...(isPendingProfile
            ? { permissions: [], passwordHash: null }
            : {}),
        },
        select: OFFICER_LIST_SELECT,
      });
    });

    return this.toListItem(officer);
  }

  async activateAccount(
    actor: AuthenticatedOfficer,
    id: string,
    dto: ActivateOfficerAccountDto,
  ): Promise<OfficerListItem> {
    const existing = await this.prisma.officer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    assertOfficerDepartmentAccess(actor, existing.departmentId);

    if (existing.divisionRole === DivisionRole.SIN_ASIGNAR) {
      throw new BadRequestException(
        'Asigne primero el funcionario a un comando con su perfil institucional',
      );
    }

    const permissions =
      dto.permissions && dto.permissions.length > 0
        ? dto.permissions
        : this.defaultPermissionsForAssignment(
            existing.divisionRole,
            existing.rangeRole,
          );

    const officer = await this.prisma.officer.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        permissions,
      },
      select: OFFICER_LIST_SELECT,
    });

    return this.toListItem(officer);
  }

  async streamOfficerPhoto(filename: string, res: Response): Promise<void> {
    await this.officerStorage.ensureStorageReady();
    this.officerStorage.assertSafeFilename(filename);

    const officer = await this.prisma.officer.findFirst({
      where: { profilePhotoFilename: filename },
      select: { id: true },
    });

    if (!officer) {
      throw new NotFoundException('Foto no encontrada');
    }

    const absolutePath = this.officerStorage.resolveAbsolutePath(filename);
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    await new Promise<void>((resolve, reject) => {
      createReadStream(absolutePath)
        .on('error', reject)
        .on('end', resolve)
        .pipe(res);
    });
  }

  async createOfficer(
    actor: AuthenticatedOfficer,
    dto: CreateOfficerDto,
  ): Promise<OfficerListItem> {
    assertDepartmentAccess(actor, dto.departmentId);
    if (actor.rangeRole !== RangeRole.SUPER_ADMIN && dto.rangeRole === RangeRole.SUPER_ADMIN) {
      throw new ForbiddenException('No puede crear un Director General');
    }
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

  async updateOfficer(
    actor: AuthenticatedOfficer,
    id: string,
    dto: UpdateOfficerDto,
  ): Promise<OfficerListItem> {
    const existing = await this.prisma.officer.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    assertOfficerDepartmentAccess(actor, existing.departmentId);
    if (dto.departmentId !== undefined) {
      assertDepartmentAccess(actor, dto.departmentId);
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
    actor: AuthenticatedOfficer,
    id: string,
    dto: SetOfficerCredentialsDto,
  ): Promise<OfficerListItem> {
    const existing = await this.prisma.officer.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    assertOfficerDepartmentAccess(actor, existing.departmentId);

    const officer = await this.prisma.officer.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      },
      select: OFFICER_LIST_SELECT,
    });

    return this.toListItem(officer);
  }

  async createDepartment(
    actor: AuthenticatedOfficer,
    dto: CreateDepartmentDto,
  ) {
    assertSuperAdmin(actor);
    return this.prisma.department.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
      },
      select: { id: true, code: true, name: true },
    });
  }

  async createSquad(actor: AuthenticatedOfficer, dto: CreateSquadDto) {
    assertDepartmentAccess(actor, dto.departmentId);
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

  async setSquadLeader(
    actor: AuthenticatedOfficer,
    squadId: string,
    leaderId: string | null,
  ) {
    const squad = await this.prisma.squad.findUnique({ where: { id: squadId } });
    if (!squad) {
      throw new NotFoundException('Escuadra no encontrada');
    }

    assertDepartmentAccess(actor, squad.departmentId);

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
    actor: AuthenticatedOfficer,
    id: string,
    data: { departmentId: string; squadId?: string | null },
  ): Promise<OfficerListItem> {
    const existing = await this.prisma.officer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    assertOfficerDepartmentAccess(actor, existing.departmentId);

    if (actor.rangeRole !== RangeRole.SUPER_ADMIN) {
      if (data.departmentId !== existing.departmentId) {
        throw new ForbiddenException(
          'Solo puede reasignar escuadras dentro de su comando',
        );
      }
      assertDepartmentAccess(actor, data.departmentId);
    } else {
      assertDepartmentAccess(actor, data.departmentId);
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

  async listPendingGraduates(
    actor: AuthenticatedOfficer,
  ): Promise<OfficerListItem[]> {
    assertSuperAdmin(actor);
    const academyDept = await this.prisma.department.findFirst({
      where: { code: 'DECT', isActive: true },
      select: { id: true },
    });

    if (!academyDept) return [];

    const officers = await this.prisma.officer.findMany({
      where: {
        divisionRole: DivisionRole.SIN_ASIGNAR,
        departmentId: academyDept.id,
        isSuspended: false,
      },
      select: OFFICER_LIST_SELECT,
      orderBy: [{ updatedAt: 'desc' }, { apellidos: 'asc' }],
    });

    return officers.map((officer) => this.toListItem(officer));
  }

  async updatePermissions(
    actor: AuthenticatedOfficer,
    id: string,
    dto: UpdateOfficerPermissionsDto,
  ): Promise<OfficerListItem> {
    const existing = await this.prisma.officer.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    assertOfficerDepartmentAccess(actor, existing.departmentId);

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

  private buildProfileCredentialNumber(cedula: string): string {
    const digits = cedula.replace(/\D/g, '').slice(-8).padStart(8, '0');
    return `POL-PER-${digits}`;
  }

  private defaultPermissionsForAssignment(
    divisionRole: DivisionRole,
    rangeRole: RangeRole,
  ): string[] {
    if (divisionRole === DivisionRole.SUB_DIRECTOR) {
      return SUB_DIRECTOR_PERMISSIONS;
    }
    if (divisionRole === DivisionRole.DIRECTOR || rangeRole === RangeRole.JEFE_DEPARTAMENTO) {
      return ROLE_DEFAULT_PERMISSIONS[RangeRole.JEFE_DEPARTAMENTO];
    }
    return ROLE_DEFAULT_PERMISSIONS[RangeRole.OFICIAL_ACTIVO];
  }

  private divisionRoleLabel(divisionRole: DivisionRole): string {
    switch (divisionRole) {
      case DivisionRole.DIRECTOR:
        return 'Director de división';
      case DivisionRole.SUB_DIRECTOR:
        return 'Subdirector';
      case DivisionRole.ORDINARIO:
        return 'Funcionario ordinario';
      default:
        return 'Sin asignar a comando';
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
      profilePhotoUrl: officer.profilePhotoFilename
        ? `/rrhh/officers/photos/${officer.profilePhotoFilename}`
        : null,
      assignmentLabel:
        officer.divisionRole === DivisionRole.SIN_ASIGNAR
          ? 'Pendiente de asignación'
          : `${officer.department.name} · ${this.divisionRoleLabel(officer.divisionRole)}`,
    };
  }
}
