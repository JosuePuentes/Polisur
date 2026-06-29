import { authHeaders, apiFetch, parseApiError } from '@/lib/api/http';
import { API_BASE_URL } from '@/lib/constants';

export interface DemoDataStatus {
  demoOfficers: number;
  demoPatrols: number;
  demoProcedures: number;
  demoDetainees: number;
  demoIncidents: number;
  hasDemoData: boolean;
}

export const demoDataApi = {
  status: async (): Promise<DemoDataStatus> => {
    const response = await apiFetch(`${API_BASE_URL}/admin/demo/status`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error(await parseApiError(response));
    return response.json() as Promise<DemoDataStatus>;
  },

  seed: async (): Promise<{ message: string; summary: Record<string, number> }> => {
    const response = await apiFetch(`${API_BASE_URL}/admin/demo/seed`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error(await parseApiError(response));
    return response.json() as Promise<{ message: string; summary: Record<string, number> }>;
  },

  clear: async (): Promise<{ removed: Record<string, number> }> => {
    const response = await apiFetch(`${API_BASE_URL}/admin/demo/clear`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error(await parseApiError(response));
    return response.json() as Promise<{ removed: Record<string, number> }>;
  },
};
