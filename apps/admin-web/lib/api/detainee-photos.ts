import { getAccessToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/constants';

export function resolveDetaineePhotoRequestUrl(publicUrl: string): string {
  if (publicUrl.startsWith('http')) {
    const path = publicUrl.replace(/^https?:\/\/[^/]+/, '');
    return `${API_BASE_URL.replace(/\/api$/, '')}${path.startsWith('/api') ? path : `/api${path}`}`;
  }
  if (publicUrl.startsWith('/api/')) {
    return `${API_BASE_URL.replace(/\/api$/, '')}${publicUrl}`;
  }
  return publicUrl;
}

export async function fetchDetaineePhotoBlobUrl(
  publicUrl: string,
): Promise<string> {
  const token = getAccessToken();
  const requestUrl = resolveDetaineePhotoRequestUrl(publicUrl);

  const response = await fetch(requestUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('No se pudo cargar la foto del detenido');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
