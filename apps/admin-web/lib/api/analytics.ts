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

export interface AnalyticsOverview {
  generatedAt: string;
  scopeLabel: string;
  scopeDepartmentId: string | null;
  kpis: {
    officersRegistered: number;
    officersActive: number;
    minutasToday: number;
    minutasThisMonth: number;
    patrolsToday: number;
    activeWeapons: number;
    activePatrolAssets: number;
    detaineesToday: number;
    detaineesThisMonth: number;
    detaineesInCustody: number;
    incidentsOpen: number;
    shiftsActiveToday: number;
  };
  minutasByDay: Array<{
    date: string;
    total: number;
    minuta: number;
    patrullaje: number;
    mixto: number;
  }>;
  minutasByMonth: Array<{ month: string; label: string; total: number }>;
  detaineesByDay: Array<{ date: string; total: number }>;
  detaineesByMonth: Array<{ month: string; label: string; total: number }>;
  proceduresByType: Array<{ type: string; label: string; count: number }>;
  incidentsByStatus: Array<{ status: string; label: string; count: number }>;
}

export async function fetchAnalyticsOverview(
  departmentId?: string,
): Promise<AnalyticsOverview> {
  const qs = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
  const response = await fetch(`${API_BASE_URL}/analytics/overview${qs}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<AnalyticsOverview>;
}
