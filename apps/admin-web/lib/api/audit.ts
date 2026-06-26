import { getAccessToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/constants';

function headers(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  const message = body.message;
  if (Array.isArray(message)) return message.join('. ');
  if (typeof message === 'string') return message;
  return 'Operación rechazada';
}

export interface AuditLogRow {
  id: string;
  traceId: string;
  actionKind: string;
  severity: string;
  actionLabel: string | null;
  officerId: string | null;
  rangeRole: string | null;
  clientIp: string;
  httpMethod: string;
  endpointUrl: string;
  statusCode: number;
  success: boolean;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  officer: { nombres: string; apellidos: string; cedula: string } | null;
}

export async function fetchAuditLogs(params?: {
  page?: number;
  limit?: number;
  severity?: string;
  success?: boolean;
}): Promise<{ items: AuditLogRow[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.severity) qs.set('severity', params.severity);
  if (params?.success !== undefined) qs.set('success', String(params.success));

  const response = await fetch(`${API_BASE_URL}/audit/logs?${qs.toString()}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}
