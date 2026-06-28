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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/operations${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<T>;
}

export const opsApi = {
  listCommands: () => api<unknown[]>('/commands'),
  createCommand: (body: {
    code: string;
    name: string;
    description?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) => api('/commands', { method: 'POST', body: JSON.stringify(body) }),
  updateCommand: (id: string, body: Record<string, unknown>) =>
    api(`/commands/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  listQuadrants: () =>
    api<
      Array<{
        id: string;
        code: string;
        quadrantNumber: number | null;
        name: string;
        parroquia: string;
        comuna: string | null;
        centerLat: number | null;
        centerLng: number | null;
        boundaryPolygon: [number, number][] | null;
        assignedOfficer: {
          id: string;
          nombres: string;
          apellidos: string;
          cedula: string;
          grado: string | null;
          department: { name: string; code: string };
        } | null;
      }>
    >('/quadrants'),
  assignQuadrantOfficer: (id: string, officerId: string | null) =>
    api(`/quadrants/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ officerId }),
    }),
  createQuadrant: (body: {
    code: string;
    name: string;
    parroquia: string;
    comuna?: string;
    quadrantNumber?: number;
    centerLat?: number;
    centerLng?: number;
    boundaryPolygon: [number, number][];
  }) => api('/quadrants', { method: 'POST', body: JSON.stringify(body) }),
  listPatrols: (departmentId?: string) =>
    api<unknown[]>(`/patrols${departmentId ? `?departmentId=${departmentId}` : ''}`),
  listMinuteCatalog: (kind?: 'CONCEPTO' | 'ASUNTO') =>
    api<Array<{ id: string; kind: string; label: string; useCount: number }>>(
      `/minute-catalog${kind ? `?kind=${kind}` : ''}`,
    ),
  addMinuteCatalog: (body: { kind: 'CONCEPTO' | 'ASUNTO'; label: string }) =>
    api('/minute-catalog', { method: 'POST', body: JSON.stringify(body) }),
  getMinuteConfig: (departmentId: string) =>
    api<{
      departmentId: string;
      divisionName: string;
      headerLines: string[];
      reseñaPrefix: string;
      lema: string;
    }>(`/minute-config/${departmentId}`),
  createPatrol: (formData: FormData) =>
    fetch(`${API_BASE_URL}/operations/patrols`, {
      method: 'POST',
      headers: {
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: formData,
    }).then(async (response) => {
      if (!response.ok) throw new Error(await parseError(response));
      return response.json();
    }),
  createPatrolJson: (body: unknown) => api('/patrols', { method: 'POST', body: JSON.stringify(body) }),
  addRecoveredObject: (patrolId: string, body: unknown) =>
    api(`/patrols/${patrolId}/recovered-objects`, { method: 'POST', body: JSON.stringify(body) }),
  heatmap: () => api<{ patrols: unknown[]; incidents: unknown[] }>('/heatmap'),
  listDetainees: (params?: { status?: string; convicted?: boolean; cellId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.convicted !== undefined) qs.set('convicted', String(params.convicted));
    if (params?.cellId) qs.set('cellId', params.cellId);
    const query = qs.toString();
    return api<unknown[]>(`/detainees${query ? `?${query}` : ''}`);
  },
  listDetentionCells: () => api<unknown[]>('/detention-cells'),
  createDetentionCell: (body: { code: string; name: string; block?: string; capacity?: number }) =>
    api('/detention-cells', { method: 'POST', body: JSON.stringify(body) }),
  getDetainee: (id: string) => api<unknown>(`/detainees/${id}`),
  createDetaineeForm: (formData: FormData) =>
    fetch(`${API_BASE_URL}/operations/detainees`, {
      method: 'POST',
      headers: {
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: formData,
    }).then(async (response) => {
      if (!response.ok) throw new Error(await parseError(response));
      return response.json();
    }),
  updateDetainee: (id: string, body: Record<string, unknown>) =>
    api(`/detainees/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  addHearing: (id: string, body: unknown) =>
    api(`/detainees/${id}/hearings`, { method: 'POST', body: JSON.stringify(body) }),
  listShifts: (fecha?: string, departmentId?: string, activeOnly?: boolean) => {
    const params = new URLSearchParams();
    if (fecha) params.set('fecha', fecha);
    if (departmentId) params.set('departmentId', departmentId);
    if (activeOnly) params.set('activeOnly', 'true');
    const qs = params.toString();
    return api<unknown[]>(`/shifts${qs ? `?${qs}` : ''}`);
  },
  activeRoster: (departmentId?: string, fecha?: string) => {
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (fecha) params.set('fecha', fecha);
    const qs = params.toString();
    return api<Array<{ officer: unknown; shift: unknown; dotStatus: string; commandName: string; commandCode: string }>>(
      `/shifts/roster${qs ? `?${qs}` : ''}`,
    );
  },
  createShift: (body: unknown) => api('/shifts', { method: 'POST', body: JSON.stringify(body) }),
  checkInShift: (id: string, body?: { latitude?: number; longitude?: number }) =>
    api(`/shifts/${id}/check-in`, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  myShift: (fecha?: string) =>
    api<{
      id: string;
      horaInicio: string;
      horaFin: string;
      status: string;
      checkInLatitude: number | null;
      checkInLongitude: number | null;
      department: { id: string; name: string; code: string };
    } | null>(`/shifts/mine${fecha ? `?fecha=${fecha}` : ''}`),
  listInventory: (departmentId?: string, turno?: string) => {
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (turno) params.set('turno', turno);
    const qs = params.toString();
    return api<unknown[]>(`/inventory${qs ? `?${qs}` : ''}`);
  },
  inventoryByShift: (departmentId: string, fecha?: string) =>
    api<{
      fecha: string;
      turnos: Array<{ turno: string; officers: unknown[]; assets: unknown[] }>;
      unassigned: Array<{ code: string; name: string }>;
      atCommandPool: Array<{ code: string; name: string }>;
    }>(`/inventory/by-shift?departmentId=${departmentId}${fecha ? `&fecha=${fecha}` : ''}`),
  inventorySummary: (departmentId?: string) =>
    api<unknown[]>(`/inventory/summary${departmentId ? `?departmentId=${departmentId}` : ''}`),
  assignInventory: (id: string, body: { officerId?: string | null; turno?: string }) =>
    api(`/inventory/${id}/assign`, { method: 'POST', body: JSON.stringify(body) }),
  releaseInventory: (id: string) => api(`/inventory/${id}/release`, { method: 'POST' }),
  createAsset: (body: {
    code: string;
    name: string;
    assetType: string;
    departmentId: string;
    serialNumber?: string;
    notas?: string;
  }) => api('/inventory', { method: 'POST', body: JSON.stringify(body) }),
  listWeapons: () => api<unknown[]>('/weapons'),
  createWeapon: (body: unknown) => api('/weapons', { method: 'POST', body: JSON.stringify(body) }),
  assignWeapon: (id: string, body: unknown) =>
    api(`/weapons/${id}/assign`, { method: 'POST', body: JSON.stringify(body) }),
  returnWeapon: (assignmentId: string) =>
    api(`/weapons/assignments/${assignmentId}/return`, { method: 'POST' }),
  weaponHistory: (weaponId: string) => api<unknown[]>(`/weapons/${weaponId}/history`),
  createControlPoint: (body: unknown) =>
    api('/control-points', { method: 'POST', body: JSON.stringify(body) }),
};
