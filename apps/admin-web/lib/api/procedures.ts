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

export interface ProcedureRecord {
  id: string;
  code: string;
  status: string;
  outcome: string | null;
  bringsDetainee: boolean | null;
  bringsObjects: boolean | null;
  bringsVehicles: boolean | null;
  bringsPersons: boolean | null;
  fijacionCompleta: boolean | null;
  fijaciones: string | null;
  mergedNarrative: string | null;
  closedAt: string | null;
  createdAt: string;
  department: { id: string; name: string; code: string };
  squad: { id: string; name: string; callsign: string | null } | null;
  departureMinute: {
    id: string;
    code: string;
    descripcion: string;
    cuadrante: string;
    createdAt: string;
    officers: Array<{
      officer: { id: string; nombres: string; apellidos: string; cedula: string; grado: string | null };
    }>;
  };
  arrivalMinute: {
    id: string;
    code: string;
    descripcion: string;
    createdAt: string;
    recoveredObjects: Array<{ id: string; description: string }>;
  } | null;
  detainee: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string | null;
    status: string;
  } | null;
}

export const proceduresApi = {
  list: (scope: 'active' | 'completed' | 'all' = 'active') =>
    fetch(`${API_BASE_URL}/procedures?scope=${scope}`, {
      headers: headers(),
      cache: 'no-store',
    }).then(async (response) => {
      if (!response.ok) throw new Error(await parseError(response));
      return response.json() as Promise<ProcedureRecord[]>;
    }),

  registerArrival: (
    id: string,
    body: {
      descripcion: string;
      latitude?: number;
      longitude?: number;
      bringsDetainee: boolean;
      bringsObjects: boolean;
      bringsVehicles?: boolean;
      bringsPersons?: boolean;
      officerIds: string[];
      leaderOfficerId?: string;
      vehicles?: Array<{
        plate: string;
        vehicleType: string;
        ownerCedula?: string;
        notes?: string;
      }>;
    },
  ) =>
    fetch(`${API_BASE_URL}/procedures/${id}/arrival`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    }).then(async (response) => {
      if (!response.ok) throw new Error(await parseError(response));
      return response.json() as Promise<ProcedureRecord>;
    }),

  closeForm: (id: string, formData: FormData) =>
    fetch(`${API_BASE_URL}/procedures/${id}/close`, {
      method: 'POST',
      headers: {
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: formData,
    }).then(async (response) => {
      if (!response.ok) throw new Error(await parseError(response));
      return response.json() as Promise<ProcedureRecord>;
    }),

  completeFijacion: (id: string, formData: FormData) =>
    fetch(`${API_BASE_URL}/procedures/${id}/complete-fijacion`, {
      method: 'POST',
      headers: {
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: formData,
    }).then(async (response) => {
      if (!response.ok) throw new Error(await parseError(response));
      return response.json() as Promise<ProcedureRecord>;
    }),

  admitTransit: (
    detaineeId: string,
    body: {
      detentionCellId: string;
      delitoInicial: string;
      nombres?: string;
      apellidos?: string;
      cedula?: string;
      alias?: string;
      notas?: string;
    },
  ) =>
    fetch(`${API_BASE_URL}/procedures/detainees/${detaineeId}/admit`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(body),
    }).then(async (response) => {
      if (!response.ok) throw new Error(await parseError(response));
      return response.json();
    }),
};
