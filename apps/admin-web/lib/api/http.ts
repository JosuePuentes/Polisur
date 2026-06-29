import { clearAuthSession, getAccessToken } from '@/lib/auth';

export function handleUnauthorized(status: number): void {
  if (status !== 401 || typeof window === 'undefined') return;
  clearAuthSession();
  const next = encodeURIComponent(window.location.pathname);
  window.location.href = `/auth/secure-command-gate?next=${next}`;
}

export function authHeaders(contentType = 'application/json'): HeadersInit {
  const token = getAccessToken();
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (contentType) {
    (headers as Record<string, string>)['Content-Type'] = contentType;
  }
  return headers;
}

export async function parseApiError(response: Response): Promise<string> {
  if (response.status === 401) {
    handleUnauthorized(401);
    return 'Sesión expirada. Inicie sesión nuevamente.';
  }

  const body = await response.json().catch(() => ({}));
  const message = body.message;
  if (Array.isArray(message)) return message.join('. ');
  if (typeof message === 'string') return message;
  return 'Operación rechazada';
}

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  if (response.status === 401) {
    handleUnauthorized(401);
  }
  return response;
}
