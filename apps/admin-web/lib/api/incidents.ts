import { getAccessToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/constants';
import type {
  Incident,
  IncidentEvidence,
  UploadEvidencePayload,
} from '@/lib/types/incident.types';

function authHeadersJson(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function authHeadersMultipart(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchIncidents(): Promise<Incident[]> {
  const response = await fetch(`${API_BASE_URL}/incidents`, {
    headers: authHeadersJson(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('FETCH_INCIDENTS_FAILED');
  }

  return response.json() as Promise<Incident[]>;
}

export async function uploadEvidence(
  payload: UploadEvidencePayload,
): Promise<IncidentEvidence> {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('incidentId', payload.incidentId);
  formData.append('stage', payload.stage);
  if (payload.descripcion) {
    formData.append('descripcion', payload.descripcion);
  }

  const response = await fetch(`${API_BASE_URL}/incidents/evidence`, {
    method: 'POST',
    headers: authHeadersMultipart(),
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      typeof body.message === 'string'
        ? body.message
        : 'No fue posible registrar la evidencia';
    throw new Error(message);
  }

  return response.json() as Promise<IncidentEvidence>;
}
