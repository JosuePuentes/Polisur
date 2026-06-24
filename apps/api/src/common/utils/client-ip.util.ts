import type { Request } from 'express';

export function resolveClientIp(request: Request): string {
  const forwarded = request.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]?.split(',')[0]?.trim() ?? 'unknown';
  }

  return request.ip ?? request.socket.remoteAddress ?? 'unknown';
}
