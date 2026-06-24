import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService, RangeRole } from '@polisur/database';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class BootstrapAdminService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
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

    const officerCount = await this.prisma.officer.count();

    if (officerCount > 0) {
      const existing = await this.prisma.officer.findUnique({
        where: { cedula },
      });

      if (!existing) {
        this.logger.log(
          'Bootstrap omitido: ya existen funcionarios y la cédula configurada no está registrada.',
        );
        return;
      }

      return;
    }

    const nombres = process.env.BOOTSTRAP_NOMBRES?.trim() || 'Administrador';
    const apellidos = process.env.BOOTSTRAP_APELLIDOS?.trim() || 'SITOP';
    const credentialNumber =
      process.env.BOOTSTRAP_CREDENTIAL?.trim() ||
      `POL-ADM-${cedula.replace(/\D/g, '').slice(-8)}`;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const department =
      (await this.prisma.department.findFirst({ where: { code: 'DECT' } })) ??
      (await this.prisma.department.create({
        data: {
          code: 'DECT',
          name: 'Dirección de Estrategia y Control Táctico',
          description: 'Mando General — bootstrap inicial',
        },
      }));

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
}
