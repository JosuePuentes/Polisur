import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { PrismaService, resolveOfficerPermissions } from '@polisur/database';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET debe estar definido en el entorno y tener al menos 32 caracteres',
    );
  }

  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedOfficer> {
    const officer = await this.prisma.officer.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        rangeRole: true,
        departmentId: true,
        squadId: true,
        isSuspended: true,
        permissions: true,
      },
    });

    if (!officer || officer.isSuspended) {
      throw new UnauthorizedException('Sesión inválida o funcionario suspendido');
    }

    return {
      id: officer.id,
      rangeRole: officer.rangeRole,
      departmentId: officer.departmentId,
      squadId: officer.squadId,
      permissions: resolveOfficerPermissions({
        rangeRole: officer.rangeRole,
        permissions: officer.permissions,
      }),
    };
  }
}
