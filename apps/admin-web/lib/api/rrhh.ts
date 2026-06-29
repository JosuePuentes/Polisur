import { authHeaders, parseApiError, apiFetch } from '@/lib/api/http';
import { API_BASE_URL } from '@/lib/constants';
import type { SitopPermission } from '@/lib/permissions';
import type {
  CreateOfficerPayload,
  CreateOfficerProfilePayload,
  OfficerRecord,
  RrhhCatalogs,
} from '@/lib/types/rrhh.types';

export async function createDepartment(payload: {
  code: string;
  name: string;
  description?: string;
}): Promise<{ id: string; code: string; name: string }> {
  const response = await fetch(`${API_BASE_URL}/rrhh/departments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

export async function createSquad(payload: {
  departmentId: string;
  name: string;
  callsign?: string;
}): Promise<{ id: string; name: string; callsign: string | null }> {
  const response = await fetch(`${API_BASE_URL}/rrhh/squads`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

export async function fetchRrhhCatalogs(): Promise<RrhhCatalogs> {
  const response = await apiFetch(`${API_BASE_URL}/rrhh/catalogs`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json() as Promise<RrhhCatalogs>;
}

export async function searchOfficers(query?: string): Promise<OfficerRecord[]> {
  const params = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  const response = await apiFetch(`${API_BASE_URL}/rrhh/officers${params}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json() as Promise<OfficerRecord[]>;
}

export async function createOfficerProfileForm(formData: FormData): Promise<OfficerRecord> {
  const response = await apiFetch(`${API_BASE_URL}/rrhh/officers/profile`, {
    method: 'POST',
    headers: authHeaders(''),
    body: formData,
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json() as Promise<OfficerRecord>;
}

export async function assignOfficerToCommand(
  id: string,
  payload: {
    departmentId: string;
    squadId?: string | null;
    divisionRole: 'DIRECTOR' | 'SUB_DIRECTOR' | 'ORDINARIO';
  },
): Promise<OfficerRecord> {
  const response = await fetch(`${API_BASE_URL}/rrhh/officers/${id}/assign`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json() as Promise<OfficerRecord>;
}

export async function activateOfficerAccount(
  id: string,
  payload: { password: string; permissions?: SitopPermission[] },
): Promise<OfficerRecord> {
  const response = await fetch(`${API_BASE_URL}/rrhh/officers/${id}/activate`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json() as Promise<OfficerRecord>;
}

export async function createOfficer(
  payload: CreateOfficerPayload,
): Promise<OfficerRecord> {
  const response = await fetch(`${API_BASE_URL}/rrhh/officers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json() as Promise<OfficerRecord>;
}

export async function updateOfficer(
  id: string,
  payload: Partial<CreateOfficerPayload>,
): Promise<OfficerRecord> {
  const response = await fetch(`${API_BASE_URL}/rrhh/officers/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json() as Promise<OfficerRecord>;
}

export async function setOfficerCredentials(
  id: string,
  password: string,
): Promise<OfficerRecord> {
  const response = await fetch(`${API_BASE_URL}/rrhh/officers/${id}/credentials`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json() as Promise<OfficerRecord>;
}

export async function updateOfficerPermissions(
  id: string,
  permissions: SitopPermission[],
): Promise<OfficerRecord> {
  const response = await fetch(`${API_BASE_URL}/rrhh/officers/${id}/permissions`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ permissions }),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json() as Promise<OfficerRecord>;
}

export async function transferOfficer(
  id: string,
  payload: { departmentId: string; squadId?: string | null },
): Promise<OfficerRecord> {
  const response = await fetch(`${API_BASE_URL}/rrhh/officers/${id}/transfer`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json() as Promise<OfficerRecord>;
}

export async function setSquadLeader(
  squadId: string,
  leaderId: string | null,
): Promise<{ id: string; name: string; leaderId: string | null }> {
  const response = await fetch(`${API_BASE_URL}/rrhh/squads/${squadId}/leader`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ leaderId }),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

export async function listPendingGraduates(): Promise<OfficerRecord[]> {
  const response = await fetch(`${API_BASE_URL}/rrhh/graduates/pending`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json() as Promise<OfficerRecord[]>;
}
