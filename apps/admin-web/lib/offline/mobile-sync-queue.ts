const STORAGE_KEY = 'polisur_mobile_offline_queue_v1';

export type MobileQueueActionType = 'check-in' | 'patrol' | 'patrol-novedad';

export interface MobileCheckInPayload {
  shiftId: string;
  latitude?: number;
  longitude?: number;
}

export interface MobilePatrolPayload {
  patrolType: 'MINUTA' | 'PATRULLAJE' | 'PROCEDIMIENTO_MIXTO';
  parroquia: string;
  cuadrante: string;
  descripcion: string;
  departmentId: string;
  squadId: string;
  officerIds: string[];
}

export interface MobilePatrolNovedadPayload {
  patrolId: string;
  description: string;
  quantity?: number;
}

export type MobileQueuePayload =
  | MobileCheckInPayload
  | MobilePatrolPayload
  | MobilePatrolNovedadPayload;

export interface QueuedMobileAction {
  id: string;
  type: MobileQueueActionType;
  payload: MobileQueuePayload;
  createdAt: string;
}

function readQueue(): QueuedMobileAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedMobileAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedMobileAction[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getQueuedMobileActions(): QueuedMobileAction[] {
  return readQueue();
}

export function enqueueMobileAction(
  type: MobileQueueActionType,
  payload: MobileQueuePayload,
): QueuedMobileAction {
  const entry: QueuedMobileAction = {
    id: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
  const next = [...readQueue(), entry];
  writeQueue(next);
  return entry;
}

export function removeQueuedMobileAction(id: string): void {
  writeQueue(readQueue().filter((item) => item.id !== id));
}

export function clearMobileQueue(): void {
  writeQueue([]);
}

export function isLikelyNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('load failed')
    );
  }
  return false;
}
