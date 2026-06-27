import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
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
  BLOOD_TYPES,
  BODY_BUILDS,
  DEFAULT_DISCENTE_PASSWORD,
  DISCENTE_LIST_SELECT,
  GRADUATED_OFFICER_SELECT,
  SKIN_COLORS,
} from './constants/academy.constants';
import { CreateDiscenteDto } from './dto/create-discente.dto';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';
import { DiscenteStorageService } from './services/discente-storage.service';
import { DISCENTE_FILE_FIELDS } from './interceptors/discente-files.interceptor';
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
    private readonly discenteStorage: DiscenteStorageService,
  ) {}

  async findAllPromociones(): Promise<PromocionWithDiscentes[]> {
    const promociones = await this.prisma.promocion.findMany({
      orderBy: { fechaInicio: 'desc' },
      include: {
        discentes: {
          where: { rangeRole: RangeRole.DISCENTE },
          select: DISCENTE_LIST_SELECT,
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

  async registerDiscente(
    dto: CreateDiscenteDto,
    files?: Record<string, Express.Multer.File[]>,
  ): Promise<unknown> {
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

    const profile = this.normalizeDiscenteProfile(dto);

    const passwordHash = await bcrypt.hash(
      DEFAULT_DISCENTE_PASSWORD,
      BCRYPT_ROUNDS,
    );

    const cedula = dto.cedula.trim();
    const credentialNumber = this.buildCredentialNumber(cedula);

    try {
      const officer = await this.prisma.officer.create({
        data: {
          cedula,
          nombres: dto.nombres.trim(),
          apellidos: dto.apellidos.trim(),
          rangeRole: RangeRole.DISCENTE,
          passwordHash,
          credentialNumber,
          departmentId: dto.departmentId,
          promocionId: dto.promocionId,
          ...profile,
        },
        select: GRADUATED_OFFICER_SELECT,
      });

      if (files) {
        await this.persistDiscenteDocuments(officer.id, files);
      }

      return this.getDiscenteDetail(officer.id);
    } catch (error) {
      this.handlePrismaUniqueViolation(error, cedula);
      throw error;
    }
  }

  async getDiscenteDetail(officerId: string): Promise<unknown> {
    const officer = await this.prisma.officer.findUnique({
      where: { id: officerId, rangeRole: RangeRole.DISCENTE },
      select: {
        ...GRADUATED_OFFICER_SELECT,
        discenteDocuments: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            label: true,
            sortOrder: true,
            createdAt: true,
          },
        },
      },
    });

    if (!officer) {
      throw new NotFoundException('Discente no encontrado');
    }

    return {
      ...officer,
      discenteDocuments: officer.discenteDocuments.map((doc) => ({
        ...doc,
        url: this.discenteStorage.buildPublicApiUrl(doc.filename),
      })),
    };
  }

  async streamDiscenteFile(filename: string, res: Response): Promise<void> {
    await this.discenteStorage.ensureStorageReady();
    this.discenteStorage.assertSafeFilename(filename);

    const document = await this.prisma.discenteDocument.findFirst({
      where: { filename },
      select: { mimeType: true },
    });

    if (!document) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const absolutePath = this.discenteStorage.resolveAbsolutePath(filename);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    await new Promise<void>((resolve, reject) => {
      createReadStream(absolutePath)
        .on('error', reject)
        .on('end', resolve)
        .pipe(res);
    });
  }

  private normalizeDiscenteProfile(dto: CreateDiscenteDto): {
    direccion?: string | null;
    telefono?: string | null;
    tipoSangre?: string | null;
    alturaCm?: number | null;
    pesoKg?: number | null;
    colorPiel?: string | null;
    contextura?: string | null;
  } {
    const tipoSangre = dto.tipoSangre?.trim().toUpperCase() || null;
    if (tipoSangre && !BLOOD_TYPES.includes(tipoSangre as (typeof BLOOD_TYPES)[number])) {
      throw new BadRequestException('Tipo de sangre no válido');
    }

    const contextura = dto.contextura?.trim() || null;
    if (contextura && !BODY_BUILDS.includes(contextura as (typeof BODY_BUILDS)[number])) {
      throw new BadRequestException('Contextura no válida');
    }

    const colorPiel = dto.colorPiel?.trim() || null;
    if (colorPiel && !SKIN_COLORS.includes(colorPiel as (typeof SKIN_COLORS)[number])) {
      throw new BadRequestException('Color de piel no válido');
    }

    const alturaCm = dto.alturaCm != null ? Number(dto.alturaCm) : null;
    const pesoKg = dto.pesoKg != null ? Number(dto.pesoKg) : null;

    if (alturaCm != null && (Number.isNaN(alturaCm) || alturaCm < 100 || alturaCm > 250)) {
      throw new BadRequestException('Altura inválida (use centímetros entre 100 y 250)');
    }

    if (pesoKg != null && (Number.isNaN(pesoKg) || pesoKg < 30 || pesoKg > 250)) {
      throw new BadRequestException('Peso inválido (use kilogramos entre 30 y 250)');
    }

    return {
      direccion: dto.direccion?.trim() || null,
      telefono: dto.telefono?.trim() || null,
      tipoSangre,
      alturaCm,
      pesoKg,
      colorPiel,
      contextura,
    };
  }

  private async persistDiscenteDocuments(
    officerId: string,
    files: Record<string, Express.Multer.File[]>,
  ): Promise<void> {
    let sortOrder = 0;

    for (const field of DISCENTE_FILE_FIELDS) {
      const uploaded = files[field.name]?.[0];
      if (!uploaded?.buffer) continue;

      const isPdf = uploaded.mimetype === 'application/pdf';
      const saved = await this.discenteStorage.saveBuffer(
        uploaded.buffer,
        officerId,
        isPdf ? 'pdf' : 'webp',
      );

      await this.prisma.discenteDocument.create({
        data: {
          officerId,
          filename: saved.filename,
          originalName: uploaded.originalname?.slice(0, 200) || null,
          mimeType: isPdf ? 'application/pdf' : 'image/webp',
          label: `Adjunto ${sortOrder + 1}`,
          sortOrder,
        },
      });

      sortOrder += 1;
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
