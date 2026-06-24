import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PrismaService,
  RangeRole,
} from '@polisur/database';
import * as bcrypt from 'bcrypt';
import { CRITICAL_ACTION_LABELS } from '../audit/audit.constants';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import {
  ACADEMY_DEPARTMENT_CODE,
  BCRYPT_ROUNDS,
  DEFAULT_DISCENTE_PASSWORD,
  GRADUATED_OFFICER_SELECT,
} from './constants/academy.constants';
import { CreateDiscenteDto } from './dto/create-discente.dto';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';
import {
  GraduatePromocionResult,
  GraduatedOfficer,
  Promocion,
  PromocionWithDiscentes,
} from './academy.types';

@Injectable()
export class AcademyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAllPromociones(): Promise<PromocionWithDiscentes[]> {
    const promociones = await this.prisma.promocion.findMany({
      orderBy: { fechaInicio: 'desc' },
      include: {
        discentes: {
          where: { rangeRole: RangeRole.DISCENTE },
          select: {
            id: true,
            cedula: true,
            nombres: true,
            apellidos: true,
          },
          orderBy: { apellidos: 'asc' },
        },
      },
    });

    return promociones.map((promocion) => ({
      ...promocion,
      totalDiscentes: promocion.discentes.length,
    }));
  }

  async getAcademyDepartment(): Promise<{ id: string; name: string; code: string }> {
    const department = await this.prisma.department.findFirst({
      where: { code: ACADEMY_DEPARTMENT_CODE, isActive: true },
      select: { id: true, name: true, code: true },
    });

    if (!department) {
      throw new NotFoundException(
        'Departamento de la Academia no configurado en el sistema',
      );
    }

    return department;
  }

  async createPromocion(dto: CreatePromocionDto): Promise<Promocion> {
    this.assertValidDateRange(dto.fechaInicio, dto.fechaFinEstimada);

    return this.prisma.promocion.create({
      data: {
        nombreCurso: dto.nombreCurso.trim(),
        fechaInicio: this.toDateOnly(dto.fechaInicio),
        fechaFinEstimada: this.toDateOnly(dto.fechaFinEstimada),
      },
    });
  }

  async updatePromocion(
    id: string,
    dto: UpdatePromocionDto,
  ): Promise<Promocion> {
    const promocion = await this.prisma.promocion.findUnique({
      where: { id },
      select: { id: true, fechaInicio: true },
    });

    if (!promocion) {
      throw new NotFoundException(`Promoción ${id} no encontrada`);
    }

    const fechaFinEstimada = this.toDateOnly(dto.fechaFinEstimada);

    if (fechaFinEstimada < promocion.fechaInicio) {
      throw new BadRequestException(
        'La fecha de finalización no puede ser anterior al inicio del curso',
      );
    }

    return this.prisma.promocion.update({
      where: { id },
      data: { fechaFinEstimada },
    });
  }

  async registerDiscente(dto: CreateDiscenteDto): Promise<GraduatedOfficer> {
    await this.assertAcademyDepartment(dto.departmentId);

    const promocion = await this.prisma.promocion.findUnique({
      where: { id: dto.promocionId },
      select: { id: true },
    });

    if (!promocion) {
      throw new NotFoundException(
        `Promoción ${dto.promocionId} no encontrada`,
      );
    }

    const passwordHash = await bcrypt.hash(
      DEFAULT_DISCENTE_PASSWORD,
      BCRYPT_ROUNDS,
    );

    const cedula = dto.cedula.trim();
    const credentialNumber = this.buildCredentialNumber(cedula);

    try {
      return await this.prisma.officer.create({
        data: {
          cedula,
          nombres: dto.nombres.trim(),
          apellidos: dto.apellidos.trim(),
          rangeRole: RangeRole.DISCENTE,
          passwordHash,
          credentialNumber,
          departmentId: dto.departmentId,
          promocionId: dto.promocionId,
        },
        select: GRADUATED_OFFICER_SELECT,
      });
    } catch (error) {
      this.handlePrismaUniqueViolation(error, cedula);
      throw error;
    }
  }

  async graduatePromocion(
    promocionId: string,
    actor: AuthenticatedOfficer,
    clientIp?: string,
  ): Promise<GraduatePromocionResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const promocion = await tx.promocion.findUnique({
        where: { id: promocionId },
        select: {
          id: true,
          nombreCurso: true,
          discentes: {
            where: { rangeRole: RangeRole.DISCENTE },
            select: { id: true },
          },
        },
      });

      if (!promocion) {
        throw new NotFoundException(`Promoción ${promocionId} no encontrada`);
      }

      if (promocion.discentes.length === 0) {
        throw new BadRequestException(
          'La promoción no tiene discentes activos para graduar',
        );
      }

      const discenteIds = promocion.discentes.map((d) => d.id);

      const { count } = await tx.officer.updateMany({
        where: {
          id: { in: discenteIds },
          promocionId,
          rangeRole: RangeRole.DISCENTE,
        },
        data: {
          rangeRole: RangeRole.OFICIAL_ACTIVO,
          promocionId: null,
          squadId: null,
        },
      });

      if (count !== discenteIds.length) {
        throw new BadRequestException(
          'Inconsistencia en la graduación: algunos discentes cambiaron de estado durante la transacción',
        );
      }

      const egresados = await tx.officer.findMany({
        where: { id: { in: discenteIds } },
        select: GRADUATED_OFFICER_SELECT,
        orderBy: { apellidos: 'asc' },
      });

      return {
        promocionId: promocion.id,
        nombreCurso: promocion.nombreCurso,
        totalGraduados: egresados.length,
        egresados,
      };
    });

    this.auditService.logCriticalAction({
      officerId: actor.id,
      rangeRole: actor.rangeRole,
      clientIp,
      actionLabel: CRITICAL_ACTION_LABELS.ACADEMY_MASS_GRADUATION,
      metadata: {
        promocionId: result.promocionId,
        nombreCurso: result.nombreCurso,
        totalGraduados: result.totalGraduados,
        egresadoIds: result.egresados.map((egresado) => egresado.id),
      },
    });

    return result;
  }

  private async assertAcademyDepartment(departmentId: string): Promise<void> {
    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        code: ACADEMY_DEPARTMENT_CODE,
        isActive: true,
      },
      select: { id: true },
    });

    if (!department) {
      throw new BadRequestException(
        'El departmentId debe corresponder al departamento de la Academia de Polisur',
      );
    }
  }

  private assertValidDateRange(inicio: Date, fin: Date): void {
    if (this.toDateOnly(fin) < this.toDateOnly(inicio)) {
      throw new BadRequestException(
        'fechaFinEstimada debe ser posterior o igual a fechaInicio',
      );
    }
  }

  private toDateOnly(date: Date): Date {
    return new Date(date.toISOString().slice(0, 10));
  }

  private buildCredentialNumber(cedula: string): string {
    const digits = cedula.replace(/\D/g, '').slice(-8).padStart(8, '0');
    return `POL-DIS-${digits}`;
  }

  private handlePrismaUniqueViolation(
    error: unknown,
    cedula: string,
  ): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target.join(', ') : 'campo único';

      if (typeof target === 'string' || fields.includes('cedula')) {
        throw new ConflictException(
          `Ya existe un funcionario registrado con la cédula ${cedula}`,
        );
      }

      throw new ConflictException(
        `Violación de unicidad en el registro del discente (${fields})`,
      );
    }
  }
}
