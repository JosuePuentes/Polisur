import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuditController } from '../audit/decorators/audit-controller.decorator';
import { resolveClientIp } from '../common/utils/client-ip.util';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginThrottleService } from './services/login-throttle.service';

@AuditController()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginThrottle: LoginThrottleService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<ReturnType<AuthService['login']>> {
    const clientIp = resolveClientIp(request);
    const throttleKey = this.loginThrottle.buildKey(clientIp, loginDto.cedula);

    this.loginThrottle.assertNotLocked(throttleKey);

    const loginState = await this.authService.findOfficerLoginState(loginDto.cedula);
    if (loginState.exists && !loginState.hasPassword) {
      throw new UnauthorizedException(
        'Cuenta pendiente de activación. Un administrador debe asignar comando y activar el usuario en RRHH.',
      );
    }

    const officer = await this.authService.validateOfficer(
      loginDto.cedula,
      loginDto.password,
    );

    if (!officer) {
      this.loginThrottle.recordFailure(throttleKey);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    this.loginThrottle.reset(throttleKey);
    return this.authService.login(officer);
  }
}
