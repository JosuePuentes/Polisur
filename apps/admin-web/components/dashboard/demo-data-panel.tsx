'use client';

import { useCallback, useEffect, useState } from 'react';
import { demoDataApi, type DemoDataStatus } from '@/lib/api/demo-data';

const DEMO_PASSWORD_HINT = 'Demo2026!';

const btnPrimary =
  'rounded-lg bg-cyan-700 px-4 py-2 text-sm text-white disabled:opacity-50';
const btnDanger =
  'rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-2 text-sm text-red-200 disabled:opacity-50';

export function DemoDataPanel() {
  const [status, setStatus] = useState<DemoDataStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    void demoDataApi.status().then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleSeed() {
    if (
      !window.confirm(
        '¿Generar historial demo? Se reemplazarán los datos demo anteriores (prefijo DEMO-). Su usuario super admin no se modifica.',
      )
    ) {
      return;
    }
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const result = await demoDataApi.seed();
      setMsg(result.message);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el demo');
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    if (
      !window.confirm(
        '¿Borrar todos los datos demo (DEMO- / V-99001xxx / V-88002xxx)? Esta acción no elimina su super admin ni los cuadrantes oficiales.',
      )
    ) {
      return;
    }
    setLoading(true);
    setError('');
    setMsg('');
    try {
      await demoDataApi.clear();
      setMsg('Datos demo eliminados correctamente.');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar el demo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-5 space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-amber-400/90">
          Solo Director General
        </p>
        <h2 className="mt-1 text-sm font-semibold text-slate-100">
          Laboratorio / datos de demostración
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Genera un historial operativo de ejemplo: funcionarios, guardias, minutas, procedimientos
          en curso, calabozos, incidentes e inventario. Todo lleva prefijo{' '}
          <span className="font-mono text-amber-300/90">DEMO-</span> para poder borrarlo sin
          afectar registros reales.
        </p>
      </div>

      {status && (
        <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-3 md:grid-cols-5">
          <p>Funcionarios demo: <span className="text-slate-200">{status.demoOfficers}</span></p>
          <p>Minutas demo: <span className="text-slate-200">{status.demoPatrols}</span></p>
          <p>Procedimientos: <span className="text-slate-200">{status.demoProcedures}</span></p>
          <p>Calabozos: <span className="text-slate-200">{status.demoDetainees}</span></p>
          <p>Incidentes: <span className="text-slate-200">{status.demoIncidents}</span></p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className={btnPrimary} disabled={loading} onClick={() => void handleSeed()}>
          {loading ? 'Procesando…' : 'Generar historial demo'}
        </button>
        <button
          type="button"
          className={btnDanger}
          disabled={loading || !status?.hasDemoData}
          onClick={() => void handleClear()}
        >
          Borrar datos demo
        </button>
      </div>

      <p className="text-[11px] text-slate-500">
        Usuarios ficticios: cédulas <span className="font-mono">V-99001001</span> a{' '}
        <span className="font-mono">V-99001006</span> · clave{' '}
        <span className="font-mono">{DEMO_PASSWORD_HINT}</span>
      </p>

      {msg && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200">
          {msg}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
    </section>
  );
}
