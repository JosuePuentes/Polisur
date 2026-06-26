'use client';

import { useState } from 'react';
import { createPromocion } from '@/lib/api/academy';

interface CreatePromocionFormProps {
  onCreated: () => void;
}

export function CreatePromocionForm({ onCreated }: CreatePromocionFormProps) {
  const [nombreCurso, setNombreCurso] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFinEstimada, setFechaFinEstimada] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createPromocion({ nombreCurso, fechaInicio, fechaFinEstimada });
      setNombreCurso('');
      setFechaInicio('');
      setFechaFinEstimada('');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la promoción');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-200">Nueva promoción / cohorte</h2>
      <input required placeholder="Nombre del curso" value={nombreCurso} onChange={(e) => setNombreCurso(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input required type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <input required type="date" value={fechaFinEstimada} onChange={(e) => setFechaFinEstimada(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={loading} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white">{loading ? 'Creando…' : 'Crear promoción'}</button>
    </form>
  );
}
