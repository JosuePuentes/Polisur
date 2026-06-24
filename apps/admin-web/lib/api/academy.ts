import { getAccessToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/constants';
import type {
  AcademyDepartment,
  ApiErrorBody,
  GraduatePromocionResult,
  Promocion,
  RegisterDiscentePayload,
  RegisteredDiscente,
} from '@/lib/types/academy.types';

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  const message = body.message;

  if (Array.isArray(message)) return message.join('. ');
  if (typeof message === 'string') return message;

  return 'Operación rechazada por el servidor';
}

export async function fetchPromociones(): Promise<Promocion[]> {
  const response = await fetch(`${API_BASE_URL}/academy/promociones`, {
    headers: authHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json() as Promise<Promocion[]>;
}

export async function fetchAcademyDepartment(): Promise<AcademyDepartment> {
  const response = await fetch(`${API_BASE_URL}/academy/departamento`, {
    headers: authHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json() as Promise<AcademyDepartment>;
}

export async function registerDiscente(
  payload: RegisterDiscentePayload,
): Promise<RegisteredDiscente> {
  const response = await fetch(`${API_BASE_URL}/academy/discentes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (response.status === 409) {
    throw new Error(await parseApiError(response));
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json() as Promise<RegisteredDiscente>;
}

export async function graduatePromocion(
  promocionId: string,
): Promise<GraduatePromocionResult> {
  const response = await fetch(
    `${API_BASE_URL}/academy/promociones/${promocionId}/graduar`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json() as Promise<GraduatePromocionResult>;
}
