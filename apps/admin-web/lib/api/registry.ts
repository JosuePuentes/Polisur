import { getAccessToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/constants';

export interface RegistryHit {
  source: string;
  id: string;
  code: string | null;
  title: string;
  summary: string;
  matchedOn: 'cedula' | 'placa' | 'serial';
  matchedValue: string;
  occurredAt: string;
  departmentName: string | null;
}

export interface RegistrySearchResult {
  query: string;
  hits: RegistryHit[];
}

export async function searchRegistry(q: string): Promise<RegistrySearchResult> {
  const token = getAccessToken();
  const params = new URLSearchParams({ q: q.trim() });
  const response = await fetch(`${API_BASE_URL}/registry/search?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body.message;
    if (Array.isArray(message)) throw new Error(message.join('. '));
    if (typeof message === 'string') throw new Error(message);
    throw new Error('Búsqueda no disponible');
  }

  return response.json() as Promise<RegistrySearchResult>;
}
