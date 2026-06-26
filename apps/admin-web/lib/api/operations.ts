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
  updateCommand: (id: string, body: Record<string, unknown>) =>
    api(`/commands/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  listQuadrants: () => api<unknown[]>('/quadrants'),
  createQuadrant: (body: unknown) => api('/quadrants', { method: 'POST', body: JSON.stringify(body) }),
  listPatrols: (departmentId?: string) =>
    api<unknown[]>(`/patrols${departmentId ? `?departmentId=${departmentId}` : ''}`),
  createPatrol: (body: unknown) => api('/patrols', { method: 'POST', body: JSON.stringify(body) }),
  addRecoveredObject: (patrolId: string, body: unknown) =>
    api(`/patrols/${patrolId}/recovered-objects`, { method: 'POST', body: JSON.stringify(body) }),
  heatmap: () => api<{ patrols: unknown[]; incidents: unknown[] }>('/heatmap'),
  listDetainees: (status?: string) =>
    api<unknown[]>(`/detainees${status ? `?status=${status}` : ''}`),
  getDetainee: (id: string) => api<unknown>(`/detainees/${id}`),
  createDetainee: (body: unknown) => api('/detainees', { method: 'POST', body: JSON.stringify(body) }),
  addHearing: (id: string, body: unknown) =>
    api(`/detainees/${id}/hearings`, { method: 'POST', body: JSON.stringify(body) }),
  listShifts: (fecha?: string, departmentId?: string) => {
    const params = new URLSearchParams();
    if (fecha) params.set('fecha', fecha);
    if (departmentId) params.set('departmentId', departmentId);
    const qs = params.toString();
    return api<unknown[]>(`/shifts${qs ? `?${qs}` : ''}`);
  },
  activeRoster: (departmentId?: string) =>
    api<Array<{ officer: unknown; shift: unknown; dotStatus: string }>>(
      `/shifts/roster${departmentId ? `?departmentId=${departmentId}` : ''}`,
    ),
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
      department: { name: string; code: string };
    } | null>(`/shifts/mine${fecha ? `?fecha=${fecha}` : ''}`),
  listInventory: (departmentId?: string, turno?: string) => {
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (turno) params.set('turno', turno);
    const qs = params.toString();
    return api<unknown[]>(`/inventory${qs ? `?${qs}` : ''}`);
  },
  inventoryByShift: (departmentId: string, fecha?: string) =>
    api<{ fecha: string; turnos: Array<{ turno: string; officers: unknown[]; assets: unknown[] }>; unassigned: unknown[] }>(
      `/inventory/by-shift?departmentId=${departmentId}${fecha ? `&fecha=${fecha}` : ''}`,
    ),
  inventorySummary: (departmentId?: string) =>
    api<unknown[]>(`/inventory/summary${departmentId ? `?departmentId=${departmentId}` : ''}`),
  assignInventory: (id: string, body: { officerId: string; turno: string }) =>
    api(`/inventory/${id}/assign`, { method: 'POST', body: JSON.stringify(body) }),
  releaseInventory: (id: string) => api(`/inventory/${id}/release`, { method: 'POST' }),
  createAsset: (body: unknown) => api('/inventory', { method: 'POST', body: JSON.stringify(body) }),
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
