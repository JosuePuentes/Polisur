import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { AuditInterceptor } from '../audit.interceptor';

/**
 * Activa la traza forense HTTP en el controlador decorado.
 * Debe aplicarse tras JwtAuthGuard cuando la ruta esté protegida.
 */
export function AuditController(): ClassDecorator {
  return applyDecorators(UseInterceptors(AuditInterceptor));
}
