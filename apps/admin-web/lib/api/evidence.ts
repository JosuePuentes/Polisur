import { getAccessToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/constants';

const LEGACY_UPLOADS_PREFIX = '/uploads/evidence/';

export function extractEvidenceFilename(imageUrl: string): string {
  const segment = imageUrl.split('/').pop();

  if (!segment || !/^[a-zA-Z0-9_-]+\.webp$/i.test(segment)) {
    throw new Error('URL de evidencia no válida');
  }

  return segment;
}

export function resolveEvidenceRequestUrl(imageUrl: string): string {
  if (imageUrl.includes('/api/incidents/evidence/')) {
    const filename = extractEvidenceFilename(imageUrl);
    return `${API_BASE_URL}/incidents/evidence/${filename}`;
  }

  if (imageUrl.includes(LEGACY_UPLOADS_PREFIX)) {
    const filename = extractEvidenceFilename(imageUrl);
    return `${API_BASE_URL}/incidents/evidence/${filename}`;
  }

  return imageUrl;
}

export async function fetchEvidenceBlobUrl(imageUrl: string): Promise<string> {
  const token = getAccessToken();

  if (!token) {
    throw new Error('Sesión no autenticada');
  }

  const requestUrl = resolveEvidenceRequestUrl(imageUrl);
  const response = await fetch(requestUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`No fue posible cargar la evidencia (${response.status})`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function fetchEvidenceAsBase64(imageUrl: string): Promise<string> {
  const token = getAccessToken();

  if (!token) {
    throw new Error('Sesión no autenticada');
  }

  const requestUrl = resolveEvidenceRequestUrl(imageUrl);
  const response = await fetch(requestUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`No fue posible cargar la evidencia (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }

  return btoa(binary);
}
