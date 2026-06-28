'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { opsApi } from '@/lib/api/operations';
import {
  getQueuedMobileActions,
  isLikelyNetworkError,
  type MobileCheckInPayload,
  type MobilePatrolNovedadPayload,
  type MobilePatrolPayload,
  type QueuedMobileAction,
  removeQueuedMobileAction,
} from '@/lib/offline/mobile-sync-queue';

export function useMobileOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(() => {
    setPendingCount(getQueuedMobileActions().length);
  }, []);

  const flushQueue = useCallback(async () => {
    const queue = getQueuedMobileActions();
    if (!queue.length || syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);
    let synced = 0;

    for (const item of queue) {
      try {
        await executeQueuedAction(item);
        removeQueuedMobileAction(item.id);
        synced += 1;
      } catch (error) {
        if (isLikelyNetworkError(error)) break;
        removeQueuedMobileAction(item.id);
      }
    }

    syncingRef.current = false;
    setSyncing(false);
    refreshCount();

    if (synced > 0) {
      setOfflineNotice(`${synced} novedad(es) sincronizada(s) con el servidor.`);
      window.setTimeout(() => setOfflineNotice(null), 5000);
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();

    const handleOnline = () => {
      void flushQueue();
    };

    window.addEventListener('online', handleOnline);
    if (navigator.onLine) {
      void flushQueue();
    }

    return () => window.removeEventListener('online', handleOnline);
  }, [flushQueue, refreshCount]);

  const notifyQueued = useCallback(() => {
    setOfflineNotice(
      'Novedad guardada localmente por falta de señal. Se sincronizará al recuperar conexión.',
    );
    refreshCount();
  }, [refreshCount]);

  return {
    pendingCount,
    syncing,
    offlineNotice,
    setOfflineNotice,
    notifyQueued,
    flushQueue,
    refreshCount,
    isLikelyNetworkError,
  };
}

async function executeQueuedAction(item: QueuedMobileAction): Promise<void> {
  switch (item.type) {
    case 'check-in': {
      const payload = item.payload as MobileCheckInPayload;
      await opsApi.checkInShift(payload.shiftId, {
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
      return;
    }
    case 'patrol': {
      const payload = item.payload as MobilePatrolPayload;
      await opsApi.createPatrolJson(payload);
      return;
    }
    case 'patrol-novedad': {
      const payload = item.payload as MobilePatrolNovedadPayload;
      await opsApi.addRecoveredObject(payload.patrolId, {
        description: payload.description,
        quantity: payload.quantity ?? 1,
      });
      return;
    }
    default:
      return;
  }
}
