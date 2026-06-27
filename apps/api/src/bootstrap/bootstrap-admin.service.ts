import { Injectable, Logger } from '@nestjs/common';
import { DEFAULT_PEACE_QUADRANTS, PrismaService, RangeRole } from '@polisur/database';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class BootstrapAdminService {
  private readonly logger = new Logger(BootstrapAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runBootstrap(): Promise<void> {
    await this.ensureOrganizationalStructure();
    await this.ensurePeaceQuadrants();

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
      const department = await this.prisma.department.findFirst({
        where: { code: 'DECT' },
      });

      await this.prisma.officer.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          rangeRole: RangeRole.SUPER_ADMIN,
          isSuspended: false,
          ...(department ? { departmentId: department.id } : {}),
        },
      });
      this.logger.log(`Bootstrap: credenciales y rol SUPER_ADMIN actualizados para cédula ${cedula}`);
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

  async ensureOrganizationalStructure(): Promise<void> {
    const departmentCount = await this.prisma.department.count();
    if (departmentCount > 0) {
      return;
    }

    const seeds = [
      { code: 'DECT', name: 'Dirección de Estrategia y Control Táctico', description: 'Academia / Mando General' },
      { code: 'DIAN', name: 'Dirección de Inteligencia y Antidrogas', description: 'Inteligencia e intervención' },
      { code: 'DIVINV', name: 'División de Investigaciones', description: 'Investigaciones penales' },
      { code: 'CANINOS', name: 'Unidad Canina', description: 'Unidad K9' },
      { code: 'VGEN', name: 'Violencia de Género', description: 'Atención a víctimas' },
      { code: 'MOTORIZ', name: 'Motorizados', description: 'Patrullaje motorizado' },
      { code: 'PINTEL', name: 'Patrullaje de Inteligencia', description: 'Inteligencia en calle' },
      { code: 'ACOPIO', name: 'Centro de Acopio Polisur', description: 'Sede central de acopio' },
    ];

    for (const seed of seeds) {
      await this.prisma.department.create({ data: seed });
    }

    const dian = await this.prisma.department.findFirst({ where: { code: 'DIAN' } });
    if (dian) {
      await this.prisma.squad.create({
        data: {
          name: 'Escuadra Táctica de Intervención A',
          callsign: 'ETA-ALPHA',
          departmentId: dian.id,
        },
      });
    }

    this.logger.log('Estructura organizacional inicial creada (8 comandos + escuadra)');
  }

  async ensurePeaceQuadrants(): Promise<void> {
    const quadrantCount = await this.prisma.peaceQuadrant.count();
    if (quadrantCount > 0) {
      return;
    }

    for (const seed of DEFAULT_PEACE_QUADRANTS) {
      await this.prisma.peaceQuadrant.create({
        data: {
          code: seed.code,
          name: seed.name,
          parroquia: seed.parroquia,
          centerLat: seed.centerLat,
          centerLng: seed.centerLng,
          boundaryPolygon: seed.boundaryPolygon,
        },
      });
    }

    this.logger.log('Cuadrantes de Paz iniciales creados (8 zonas georreferenciadas)');
  }
}
