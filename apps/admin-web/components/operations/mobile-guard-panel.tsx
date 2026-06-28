'use client';

import { FormEvent, useEffect, useState } from 'react';
import { opsApi } from '@/lib/api/operations';
import { getSession } from '@/lib/auth';
import { useMobileOfflineSync } from '@/lib/hooks/use-mobile-offline-sync';
import {
  enqueueMobileAction,
  type MobileCheckInPayload,
  type MobilePatrolPayload,
} from '@/lib/offline/mobile-sync-queue';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';
import { PARROQUIAS_SAN_FRANCISCO, SECTORES_REFERENCIA } from '@/lib/constants/public-portal';

const inputCls = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100';

type ShiftInfo = {
  id: string;
  horaInicio: string;
  horaFin: string;
  status: string;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  department: { id: string; name: string; code: string };
};

export function MobileGuardPanel() {
  const session = getSession();
  const canCheckIn = hasPermission(session?.permissions, SITOP_PERMISSIONS.SHIFTS_MANAGE);
  const canPatrol = hasPermission(session?.permissions, SITOP_PERMISSIONS.PATROL_MANAGE);
  const {
    pendingCount,
    syncing,
    offlineNotice,
    setOfflineNotice,
    notifyQueued,
    isLikelyNetworkError,
    refreshCount,
  } = useMobileOfflineSync();

  const [shift, setShift] = useState<ShiftInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [novedad, setNovedad] = useState('');
  const [cuadrante, setCuadrante] = useState<string>(SECTORES_REFERENCIA[0]);
  const [submitting, setSubmitting] = useState(false);

  function reload() {
    setLoading(true);
    void opsApi
      .myShift()
      .then((s) => setShift(s as ShiftInfo | null))
      .catch(() => setShift(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setGps(null),
        { enableHighAccuracy: true },
      );
    }
  }, []);

  async function runWithOfflineFallback<T>(
    type: 'check-in' | 'patrol',
    payload: MobileCheckInPayload | MobilePatrolPayload,
    request: () => Promise<T>,
    onSuccess: (result: T) => void,
  ) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await request();
      onSuccess(result);
      refreshCount();
    } catch (err) {
      if (isLikelyNetworkError(err) || !navigator.onLine) {
        enqueueMobileAction(type, payload);
        notifyQueued();
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo completar la operación');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleCheckIn() {
    if (!shift) return;
    const coords = gps ? { latitude: gps.lat, longitude: gps.lng } : undefined;
    const payload: MobileCheckInPayload = {
      shiftId: shift.id,
      ...coords,
    };

    void runWithOfflineFallback(
      'check-in',
      payload,
      () => opsApi.checkInShift(shift.id, coords),
      () => {
        setMsg('Llegada registrada con éxito');
        reload();
      },
    );
  }

  function handleNovedadSubmit(event: FormEvent) {
    event.preventDefault();
    if (!shift || !session?.id || !session.departmentId || novedad.trim().length < 10) return;

    const squadId = session.squadId;
    if (!squadId) {
      setError('Debe tener escuadra asignada para reportar novedades en calle.');
      return;
    }

    const payload: MobilePatrolPayload = {
      patrolType: 'MINUTA',
      parroquia: PARROQUIAS_SAN_FRANCISCO[0],
      cuadrante,
      descripcion: `[Novedad móvil] ${novedad.trim()}`,
      departmentId: shift.department.id,
      squadId,
      officerIds: [session.id],
    };

    void runWithOfflineFallback(
      'patrol',
      payload,
      () => opsApi.createPatrolJson(payload),
      () => {
        setMsg('Minuta / novedad transmitida al comando');
        setNovedad('');
      },
    );
  }

  const statusLabel: Record<string, string> = {
    ON_DUTY_PENDING: 'En guardia — pendiente de llegada',
    ON_DUTY_ACTIVE: 'Presente en servicio',
    OFF_DUTY: 'Fuera de guardia',
  };

  const dotColor: Record<string, string> = {
    ON_DUTY_PENDING: 'bg-orange-500',
    ON_DUTY_ACTIVE: 'bg-emerald-500',
    OFF_DUTY: 'bg-slate-500',
  };

  return (
    <div className="mx-auto max-w-md space-y-6 px-2 py-4">
      <header className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-500/80">SITOP Móvil</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-100">Mi guardia de hoy</h1>
        <p className="mt-1 text-sm text-slate-400">{session?.rangeRole.replace(/_/g, ' ')}</p>
      </header>

      {(offlineNotice || pendingCount > 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          {offlineNotice ??
            `${pendingCount} reporte(s) pendiente(s) de sincronización${syncing ? '…' : '.'}`}
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => setOfflineNotice(null)}
              className="mt-2 block text-xs text-amber-300 underline"
            >
              Entendido
            </button>
          )}
        </div>
      )}

      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
          {msg}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm text-slate-500">Cargando guardia…</p>
      ) : !shift ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center">
          <p className="text-slate-300">No tiene guardia programada para hoy.</p>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-center gap-3">
            <span className={`h-4 w-4 rounded-full ${dotColor[shift.status] ?? dotColor.OFF_DUTY}`} />
            <span className="text-sm text-slate-300">{statusLabel[shift.status] ?? shift.status}</span>
          </div>
          <div className="space-y-2 text-center text-sm text-slate-400">
            <p className="text-lg font-semibold text-slate-100">{shift.department.name}</p>
            <p>
              Horario: {shift.horaInicio} — {shift.horaFin}
            </p>
            {gps && (
              <p className="font-mono text-xs text-cyan-500/80">
                GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
              </p>
            )}
            {shift.checkInLatitude != null && shift.checkInLongitude != null && (
              <p className="text-xs text-emerald-400">
                Check-in: {shift.checkInLatitude.toFixed(5)}, {shift.checkInLongitude.toFixed(5)}
              </p>
            )}
          </div>

          {canCheckIn && shift.status === 'ON_DUTY_PENDING' && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleCheckIn}
              className="w-full rounded-2xl bg-cyan-600 py-4 text-base font-semibold text-white shadow-lg shadow-cyan-900/40 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? 'Registrando…' : 'Marcar llegada con GPS'}
            </button>
          )}
        </div>
      )}

      {canPatrol && shift && (
        <form
          onSubmit={(e) => void handleNovedadSubmit(e)}
          className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
        >
          <h2 className="text-sm font-semibold text-slate-200">Minuta / novedad en calle</h2>
          <select
            value={cuadrante}
            onChange={(e) => setCuadrante(e.target.value)}
            className={inputCls}
          >
            {SECTORES_REFERENCIA.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <textarea
            required
            minLength={10}
            value={novedad}
            onChange={(e) => setNovedad(e.target.value)}
            placeholder="Relato de la novedad por radio o hallazgo en patrulla…"
            className={`${inputCls} min-h-[120px] text-sm`}
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-slate-700 py-3 text-sm font-semibold text-slate-100 disabled:opacity-60"
          >
            {submitting ? 'Enviando…' : 'Enviar novedad al comando'}
          </button>
        </form>
      )}

      <button type="button" onClick={reload} className={`${inputCls} text-center text-sm text-slate-400`}>
        Actualizar
      </button>
    </div>
  );
}
