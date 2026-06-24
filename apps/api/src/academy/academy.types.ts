import { Officer, Prisma, Promocion } from '@polisur/database';
import { GRADUATED_OFFICER_SELECT } from './constants/academy.constants';

export type GraduatedOfficer = Prisma.OfficerGetPayload<{
  select: typeof GRADUATED_OFFICER_SELECT;
}>;

export type PromocionDiscente = Pick<
  GraduatedOfficer,
  'id' | 'cedula' | 'nombres' | 'apellidos'
>;

export interface PromocionWithDiscentes extends Promocion {
  discentes: PromocionDiscente[];
  totalDiscentes: number;
}

export interface GraduatePromocionResult {
  promocionId: string;
  nombreCurso: string;
  totalGraduados: number;
  egresados: GraduatedOfficer[];
}

export type { Officer, Promocion };
