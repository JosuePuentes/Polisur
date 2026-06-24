import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { resolveClientIp } from '../common/utils/client-ip.util';
import { AuditService } from './audit.service';
import {
  sanitizeAuditBody,
  sanitizeQueryParams,
  sanitizeRouteParams,
} from './utils/sanitize-audit-payload.util';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedOfficer;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const startedAt = Date.now();
    const traceId = crypto.randomUUID();

    const officer = request.user;
    const clientIp = resolveClientIp(request);
    const endpointUrl = this.resolveEndpointUrl(request);
    const routeParams = sanitizeRouteParams(request.params);
    const queryParams = sanitizeQueryParams(request.query);
    const requestBody = sanitizeAuditBody(request);

    return next.handle().pipe(
      tap(() => {
        const response = http.getResponse<Response>();
        this.auditService.scheduleHttpAudit({
          traceId,
          officerId: officer?.id ?? null,
          rangeRole: officer?.rangeRole ?? null,
          clientIp,
          httpMethod: request.method,
          endpointUrl,
          routeParams,
          queryParams,
          requestBody,
          statusCode: response.statusCode,
          success: response.statusCode < 400,
          durationMs: Date.now() - startedAt,
        });
      }),
      catchError((error: unknown) => {
        const statusCode = this.resolveErrorStatusCode(error);
        const errorMessage = this.resolveErrorMessage(error);

        this.auditService.scheduleHttpAudit({
          traceId,
          officerId: officer?.id ?? null,
          rangeRole: officer?.rangeRole ?? null,
          clientIp,
          httpMethod: request.method,
          endpointUrl,
          routeParams,
          queryParams,
          requestBody,
          statusCode,
          success: false,
          durationMs: Date.now() - startedAt,
          errorMessage,
        });

        return throwError(() => error);
      }),
    );
  }

  private resolveEndpointUrl(request: Request): string {
    const base = request.originalUrl ?? request.url;
    return base.split('?')[0] ?? base;
  }

  private resolveErrorStatusCode(error: unknown): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    return 500;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (typeof response === 'object' && response !== null) {
        const message = (response as { message?: string | string[] }).message;

        if (Array.isArray(message)) {
          return message.join('; ');
        }

        if (typeof message === 'string') {
          return message;
        }
      }

      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Error interno no clasificado';
  }
}
