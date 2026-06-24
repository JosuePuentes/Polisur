import { API_BASE_URL } from '@/lib/constants';

export interface PublicDenunciaPayload {
  delito: string;
  parroquia: string;
  sector: string;
  descripcion: string;
  evidencias?: File[];
}

export interface PublicIncidentResponse {
  id: string;
  code: string;
  status: string;
  cuadrante: string;
  message: string;
}

export interface PanicAlertPayload {
  latitud: number;
  longitud: number;
}

async function parsePublicError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    const message = body.message;

    if (Array.isArray(message)) {
      return message.join('. ');
    }

    if (typeof message === 'string') {
      return message;
    }
  } catch {
    // respuesta no JSON
  }

  if (response.status === 429) {
    return 'Demasiadas solicitudes. Espere un momento e intente nuevamente.';
  }

  return `Error del servidor (${response.status})`;
}

export async function submitPublicDenuncia(
  payload: PublicDenunciaPayload,
): Promise<PublicIncidentResponse> {
  const formData = new FormData();
  formData.append('delito', payload.delito);
  formData.append('parroquia', payload.parroquia);
  formData.append('sector', payload.sector);
  formData.append('descripcion', payload.descripcion);

  for (const file of payload.evidencias ?? []) {
    formData.append('evidencias', file);
  }

  const response = await fetch(`${API_BASE_URL}/public/denuncias`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parsePublicError(response));
  }

  return response.json() as Promise<PublicIncidentResponse>;
}

export async function submitPanicAlert(
  payload: PanicAlertPayload,
): Promise<PublicIncidentResponse> {
  const response = await fetch(`${API_BASE_URL}/public/panico`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parsePublicError(response));
  }

  return response.json() as Promise<PublicIncidentResponse>;
}
