'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/auth';
import {
  TACTICAL_EVENTS,
  TACTICAL_WS_URL,
  type TacticalSocketIncident,
} from '@/lib/constants/tactical-socket';

interface UseTacticalSocketOptions {
  enabled?: boolean;
  onIncidentCreated?: (incident: TacticalSocketIncident) => void;
  onPanicAlert?: (incident: TacticalSocketIncident) => void;
}

export function useTacticalSocket({
  enabled = true,
  onIncidentCreated,
  onPanicAlert,
}: UseTacticalSocketOptions): void {
  const socketRef = useRef<Socket | null>(null);
  const onIncidentRef = useRef(onIncidentCreated);
  const onPanicRef = useRef(onPanicAlert);

  useEffect(() => {
    onIncidentRef.current = onIncidentCreated;
    onPanicRef.current = onPanicAlert;
  }, [onIncidentCreated, onPanicAlert]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      return;
    }

    const socket = io(TACTICAL_WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      auth: { token },
    });

    socketRef.current = socket;

    socket.on(TACTICAL_EVENTS.INCIDENT_CREATED, (payload: TacticalSocketIncident) => {
      onIncidentRef.current?.(payload);
    });

    socket.on(TACTICAL_EVENTS.PANIC_ALERT, (payload: TacticalSocketIncident) => {
      onPanicRef.current?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);
}
