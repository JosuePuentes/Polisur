'use client';

import dynamic from 'next/dynamic';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { MobileMinuteModal } from '@/components/operations/mobile-minute-modal';
import type { MobilePatrolUnit } from '@/components/operations/mobile-patrol-map';
import { opsApi } from '@/lib/api/operations';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';

const MobilePatrolMap = dynamic(
  () =>
    import('@/components/operations/mobile-patrol-map').then((mod) => mod.MobilePatrolMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100dvh-8rem)] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
        <p className="text-sm text-slate-500">Cargando mapa táctico…</p>
      </div>
    ),
  },
);

const STORAGE_KEY = 'polisur_mobile_patrol_active_v1';
const LIVE_POLL_MS = 30_000;
const POSITION_SYNC_MS = 60_000;

const inputCls =
  'w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100';

type ActivationInfo = {
  officer: {
    id: string;
    nombres: string;
    apellidos: string;
    credentialNumber: string;
    grado: string | null;
  };
  shift: {
    id: string;
    status: string;
    horaInicio: string;
    horaFin: string;
    department: { id: string; name: string; code: string };
  } | null;
};

export function MobileGuardPanel() {
  const session = getSession();
  const canPatrol = hasPermission(session?.permissions, SITOP_PERMISSIONS.PATROL_MANAGE);

  const [activated, setActivated] = useState(false);
  const [activation, setActivation] = useState<ActivationInfo | null>(null);
  const [credentialNumber, setCredentialNumber] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDenied, setGpsDenied] = useState(false);
  const [units, setUnits] = useState<MobilePatrolUnit[]>([]);
  const [minuteOpen, setMinuteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsDenied(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsDenied(false);
      },
      () => setGpsDenied(true),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGpsDenied(true),
      { enableHighAccuracy: true },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ActivationInfo;
        setActivation(parsed);
        setActivated(true);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!activated) return;
    const cleanup = requestGps();
    return cleanup;
  }, [activated, requestGps]);

  const loadLivePatrols = useCallback(async () => {
    try {
      const live = await opsApi.listMobileLivePatrols();
      setUnits(live);
    } catch {
      // Silencioso en mapa — el usuario puede seguir operando
    }
  }, []);

  useEffect(() => {
    if (!activated) return;
    void loadLivePatrols();
    const timer = window.setInterval(() => void loadLivePatrols(), LIVE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [activated, loadLivePatrols]);

  useEffect(() => {
    if (!activated || !gps) return;
    const sync = () => {
      void opsApi.updateMobilePosition({ latitude: gps.lat, longitude: gps.lng });
    };
    sync();
    const timer = window.setInterval(sync, POSITION_SYNC_MS);
    return () => window.clearInterval(timer);
  }, [activated, gps]);

  async function handleActivate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMsg(null);
    setSubmitting(true);

    try {
      const result = (await opsApi.activateMobilePatrol({
        credentialNumber: credentialNumber.trim(),
        latitude: gps?.lat,
        longitude: gps?.lng,
      })) as ActivationInfo;

      setActivation(result);
      setActivated(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      setMsg(`Patrullaje activado — ${result.officer.nombres} ${result.officer.apellidos}`);
      requestGps();
      void loadLivePatrols();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar el patrullaje');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeactivate() {
    setActivated(false);
    setActivation(null);
    localStorage.removeItem(STORAGE_KEY);
    setMsg('Patrullaje desactivado');
  }

  if (!activated) {
    return (
      <div className="mx-auto max-w-md space-y-6 px-2 py-6">
        <header className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-500/80">
            SITOP Móvil · Patrullaje
          </p>
          <h1 className="mt-2 text-xl font-semibold text-slate-100">Activar servicio en calle</h1>
          <p className="mt-2 text-sm text-slate-400">
            Ingrese su número de credencial institucional para abrir el mapa de patrullaje.
          </p>
        </header>

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

        <form
          onSubmit={(e) => void handleActivate(e)}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
        >
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-wider text-slate-500">
              Número de credencial
            </span>
            <input
              required
              autoComplete="off"
              inputMode="numeric"
              className={inputCls}
              placeholder="Ej. 00012345"
              value={credentialNumber}
              onChange={(e) => setCredentialNumber(e.target.value)}
            />
          </label>

          <p className="text-xs text-slate-500">
            Al activar se solicitará permiso de ubicación para mostrar su patrulla en el mapa.
          </p>

          <button
            type="submit"
            disabled={submitting || credentialNumber.trim().length < 3}
            className="w-full rounded-2xl bg-cyan-600 py-4 text-base font-semibold text-white shadow-lg shadow-cyan-900/40 disabled:opacity-60"
          >
            {submitting ? 'Verificando…' : 'Activar patrullaje'}
          </button>
        </form>
      </div>
    );
  }

  const departmentId =
    activation?.shift?.department.id ?? session?.departmentId ?? '';
  const squadId = session?.squadId ?? null;

  return (
    <div className="relative space-y-3 px-1 py-2">
      <header className="flex items-start justify-between gap-3 px-1">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-500/80">
            Patrullaje activo
          </p>
          <h1 className="text-lg font-semibold text-slate-100">
            {activation?.officer.grado ? `${activation.officer.grado} ` : ''}
            {activation?.officer.nombres} {activation?.officer.apellidos}
          </h1>
          <p className="text-xs text-slate-500">
            Cred. {activation?.officer.credentialNumber}
            {activation?.shift
              ? ` · ${activation.shift.department.name} (${activation.shift.horaInicio}–${activation.shift.horaFin})`
              : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDeactivate}
          className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400"
        >
          Salir
        </button>
      </header>

      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2 text-sm text-emerald-200">
          {msg}
        </div>
      )}

      {gpsDenied && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-2 text-sm text-amber-100">
          Active la ubicación del dispositivo para verse en el mapa como patrulla.
          <button
            type="button"
            onClick={requestGps}
            className="mt-2 block text-xs text-amber-300 underline"
          >
            Reintentar GPS
          </button>
        </div>
      )}

      <MobilePatrolMap units={units} selfPosition={gps} activated={activated} />

      <p className="px-1 text-center text-xs text-slate-500">
        {units.length} unidad(es) en patrullaje · actualización cada 30 s
      </p>

      {canPatrol && departmentId && (
        <>
          <button
            type="button"
            onClick={() => setMinuteOpen(true)}
            className="fixed bottom-6 right-4 z-40 rounded-2xl bg-cyan-600 px-5 py-4 text-sm font-semibold text-white shadow-xl shadow-cyan-900/50"
          >
            Realizar minuta
          </button>

          <MobileMinuteModal
            open={minuteOpen}
            onClose={() => setMinuteOpen(false)}
            departmentId={departmentId}
            squadId={squadId}
            gps={gps}
            onSuccess={(message) => {
              setMsg(message);
              void loadLivePatrols();
            }}
          />
        </>
      )}
    </div>
  );
}
