import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService, resolveOfficerPermissions } from '@polisur/database';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { SafeOfficer } from './types/safe-officer.type';
import { buildCedulaLookupVariants } from '../common/utils/cedula-lookup.util';

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

const OFFICER_PUBLIC_SELECT = {
  id: true,
  cedula: true,
  nombres: true,
  apellidos: true,
  rangeRole: true,
  credentialNumber: true,
  qrToken: true,
  telefono: true,
  email: true,
  fechaNacimiento: true,
  direccion: true,
  tipoSangre: true,
  alturaCm: true,
  pesoKg: true,
  colorPiel: true,
  contextura: true,
  divisionRole: true,
  profilePhotoFilename: true,
  grado: true,
  fechaIngreso: true,
  permissions: true,
  isSuspended: true,
  createdAt: true,
  updatedAt: true,
  departmentId: true,
  squadId: true,
  promocionId: true,
  passwordHash: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateOfficer(
    cedula: string,
    passwordPlain: string,
  ): Promise<SafeOfficer | null> {
    const officer = await this.findOfficerByCedula(cedula);

    if (!officer || officer.isSuspended) {
      return null;
    }

    if (!officer.passwordHash) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(passwordPlain, officer.passwordHash);
    if (!passwordMatches) {
      return null;
    }

    const { passwordHash: _passwordHash, ...safeOfficer } = officer;
    return safeOfficer;
  }

  async findOfficerLoginState(
    cedula: string,
  ): Promise<{ exists: boolean; hasPassword: boolean; isSuspended: boolean }> {
    const officer = await this.findOfficerByCedula(cedula);
    if (!officer) {
      return { exists: false, hasPassword: false, isSuspended: false };
    }
    return {
      exists: true,
      hasPassword: Boolean(officer.passwordHash),
      isSuspended: officer.isSuspended,
    };
  }

  private async findOfficerByCedula(
    cedula: string,
  ): Promise<(SafeOfficer & { passwordHash: string | null }) | null> {
    return this.prisma.officer.findFirst({
      where: { cedula: { in: buildCedulaLookupVariants(cedula) } },
      select: OFFICER_PUBLIC_SELECT,
    });
  }

  login(officer: SafeOfficer): LoginResponse {
    const permissions = resolveOfficerPermissions({
      rangeRole: officer.rangeRole,
      permissions: officer.permissions,
    });

    const payload: JwtPayload = {
      sub: officer.id,
      rangeRole: officer.rangeRole,
      departmentId: officer.departmentId,
      squadId: officer.squadId ?? null,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '8h',
    };
  }
}
