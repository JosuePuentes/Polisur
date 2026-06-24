import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedOfficer } from '../interfaces/authenticated-officer.interface';

export const GetUser = createParamDecorator(
  (
    data: keyof AuthenticatedOfficer | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedOfficer | AuthenticatedOfficer[keyof AuthenticatedOfficer] => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedOfficer }>();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        'Funcionario no autenticado. El guard JWT debe poblar request.user.',
      );
    }

    return data ? user[data] : user;
  },
);
