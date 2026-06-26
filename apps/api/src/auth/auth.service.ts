import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService, resolveOfficerPermissions } from '@polisur/database';
import * as bcrypt from 'bcrypt';
import { TIMING_SAFE_DUMMY_HASH } from './constants/auth.constants';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { SafeOfficer } from './types/safe-officer.type';

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
    const normalizedCedula = cedula.trim();

    const officer = await this.prisma.officer.findUnique({
      where: { cedula: normalizedCedula },
      select: OFFICER_PUBLIC_SELECT,
    });

    const hashToCompare = officer?.passwordHash ?? TIMING_SAFE_DUMMY_HASH;
    const passwordMatches = await bcrypt.compare(passwordPlain, hashToCompare);

    if (!officer || officer.isSuspended || !officer.passwordHash || !passwordMatches) {
      return null;
    }

    const { passwordHash: _passwordHash, ...safeOfficer } = officer;
    return safeOfficer;
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
