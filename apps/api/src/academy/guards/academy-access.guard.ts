import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService, RangeRole } from '@polisur/database';
import { AuthenticatedOfficer } from '../../common/interfaces/authenticated-officer.interface';
import { ACADEMY_DEPARTMENT_CODE } from '../constants/academy.constants';

/**
 * SUPER_ADMIN o Jefe de Departamento asignado a la Academia (DECT).
 */
@Injectable()
export class AcademyAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedOfficer }>();

    const officer = request.user;

    if (!officer) {
      throw new ForbiddenException('Acceso restringido a la Academia');
    }

    if (officer.rangeRole === RangeRole.SUPER_ADMIN) {
      return true;
    }

    if (officer.rangeRole === RangeRole.JEFE_DEPARTAMENTO) {
      const department = await this.prisma.department.findUnique({
        where: { id: officer.departmentId },
        select: { code: true, isActive: true },
      });

      if (
        department?.isActive &&
        department.code === ACADEMY_DEPARTMENT_CODE
      ) {
        return true;
      }
    }

    throw new ForbiddenException(
      'Solo el Director General o el mando administrativo de la Academia pueden ejecutar esta operación',
    );
  }
}
