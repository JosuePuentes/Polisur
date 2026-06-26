import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService, RangeRole } from '@polisur/database';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class BootstrapAdminService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureOrganizationalStructure();

    const cedula = process.env.BOOTSTRAP_CEDULA?.trim();
    const password = process.env.BOOTSTRAP_PASSWORD;

    if (!cedula || !password) {
      return;
    }

    if (password.length < 8) {
      this.logger.warn(
        'BOOTSTRAP_PASSWORD debe tener al menos 8 caracteres; se omite bootstrap.',
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const existing = await this.prisma.officer.findUnique({ where: { cedula } });

    if (existing) {
      await this.prisma.officer.update({
        where: { id: existing.id },
        data: { passwordHash, isSuspended: false },
      });
      this.logger.log(`Bootstrap: credenciales actualizadas para cédula ${cedula}`);
      return;
    }

    const officerCount = await this.prisma.officer.count();
    if (officerCount > 0) {
      this.logger.log(
        'Bootstrap omitido: ya existen funcionarios y la cédula configurada no está registrada.',
      );
      return;
    }

    const department = await this.prisma.department.findFirst({
      where: { code: 'DECT' },
    });

    if (!department) {
      return;
    }

    const nombres = process.env.BOOTSTRAP_NOMBRES?.trim() || 'Administrador';
    const apellidos = process.env.BOOTSTRAP_APELLIDOS?.trim() || 'SITOP';
    const credentialNumber =
      process.env.BOOTSTRAP_CREDENTIAL?.trim() ||
      `POL-ADM-${cedula.replace(/\D/g, '').slice(-8)}`;

    await this.prisma.officer.create({
      data: {
        cedula,
        nombres,
        apellidos,
        rangeRole: RangeRole.SUPER_ADMIN,
        passwordHash,
        credentialNumber,
        departmentId: department.id,
      },
    });

    this.logger.log(`Usuario inicial creado (SUPER_ADMIN): cédula ${cedula}`);
  }

  private async ensureOrganizationalStructure(): Promise<void> {
    const departmentCount = await this.prisma.department.count();
    if (departmentCount > 0) {
      return;
    }

    const dect = await this.prisma.department.create({
      data: {
        code: 'DECT',
        name: 'Dirección de Estrategia y Control Táctico',
        description: 'Academia / Mando General municipal',
      },
    });

    const dian = await this.prisma.department.create({
      data: {
        code: 'DIAN',
        name: 'Dirección de Inteligencia y Antidrogas',
        description: 'Comando de inteligencia e intervención antidrogas',
      },
    });

    await this.prisma.squad.create({
      data: {
        name: 'Escuadra Táctica de Intervención A',
        callsign: 'ETA-ALPHA',
        departmentId: dian.id,
      },
    });

    this.logger.log(
      `Estructura organizacional inicial creada (DECT, DIAN, escuadra ${dect.code}/${dian.code})`,
    );
  }
}
