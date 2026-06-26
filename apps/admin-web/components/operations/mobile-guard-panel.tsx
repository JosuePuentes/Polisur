'use client';

import { useEffect, useState } from 'react';
import { opsApi } from '@/lib/api/operations';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';

const inputCls = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100';

export function MobileGuardPanel() {
  const session = getSession();
  const canCheckIn = hasPermission(session?.permissions, SITOP_PERMISSIONS.SHIFTS_MANAGE);
  const [shift, setShift] = useState<{
    id: string;
    horaInicio: string;
    horaFin: string;
    status: string;
    checkInLatitude: number | null;
    checkInLongitude: number | null;
    department: { name: string; code: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  function reload() {
    setLoading(true);
    void opsApi.myShift()
      .then((s) => setShift(s))
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

  function handleCheckIn() {
    if (!shift) return;
    setError(null);
    const coords = gps ? { latitude: gps.lat, longitude: gps.lng } : undefined;
    void opsApi.checkInShift(shift.id, coords)
      .then(() => {
        setMsg('Llegada registrada con éxito');
        reload();
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo marcar llegada'));
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

      {msg && <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">{msg}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">{error}</div>}

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
            <p>Horario: {shift.horaInicio} — {shift.horaFin}</p>
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
              onClick={handleCheckIn}
              className="w-full rounded-2xl bg-cyan-600 py-4 text-base font-semibold text-white shadow-lg shadow-cyan-900/40 active:scale-[0.98]"
            >
              Marcar llegada con GPS
            </button>
          )}
        </div>
      )}

      <button type="button" onClick={reload} className={inputCls + ' text-center text-sm text-slate-400'}>
        Actualizar
      </button>
    </div>
  );
}
