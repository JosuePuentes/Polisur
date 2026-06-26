'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createRadioDispatch,
  fetchIncidentCatalogs,
  type IncidentCatalogs,
} from '@/lib/api/incidents';
import { PARROQUIAS_SAN_FRANCISCO, SECTORES_REFERENCIA } from '@/lib/constants/public-portal';
import type { Incident } from '@/lib/types/incident.types';

const DELITOS_RADIO = [
  'Alteración del orden público',
  'Robo en vía pública',
  'Accidente de tránsito',
  'Disturbios / Riñas',
  'Persona sospechosa',
  'Apoyo a patrulla en calle',
  'Otro (especificar en relato)',
];

interface RadioDispatchModalProps {
  open: boolean;
  onClose: () => void;
  onDispatched: (incident: Incident) => void;
}

export function RadioDispatchModal({
  open,
  onClose,
  onDispatched,
}: RadioDispatchModalProps) {
  const [catalogs, setCatalogs] = useState<IncidentCatalogs | null>(null);
  const [tipoDelito, setTipoDelito] = useState(DELITOS_RADIO[0]);
  const [parroquia, setParroquia] = useState<string>(PARROQUIAS_SAN_FRANCISCO[0]);
  const [cuadrante, setCuadrante] = useState<string>(SECTORES_REFERENCIA[0]);
  const [descripcion, setDescripcion] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [squadId, setSquadId] = useState('');
  const [initialStatus, setInitialStatus] = useState<'EN_TRANSITO' | 'DESPACHADO'>(
    'EN_TRANSITO',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const squads = useMemo(
    () => catalogs?.departments.find((d) => d.id === departmentId)?.squads ?? [],
    [catalogs, departmentId],
  );

  useEffect(() => {
    if (!open) return;
    void fetchIncidentCatalogs()
      .then((data) => {
        setCatalogs(data);
        if (data.departments[0]) {
          setDepartmentId(data.departments[0].id);
          setSquadId(data.departments[0].squads[0]?.id ?? '');
        }
      })
      .catch(() => setError('No se pudieron cargar los catálogos operativos'));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!departmentId || !squadId || descripcion.trim().length < 10) return;

    setLoading(true);
    setError(null);

    try {
      const incident = await createRadioDispatch({
        tipoDelito,
        parroquia,
        cuadrante,
        descripcion: descripcion.trim(),
        departmentId,
        squadId,
        initialStatus,
      });
      onDispatched(incident);
      setDescripcion('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el despacho');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-amber-500/40 bg-slate-900 shadow-2xl shadow-amber-900/20">
        <header className="border-b border-amber-500/20 bg-amber-950/30 px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400/90">
            Central de Despacho · Radio / Teléfono
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">
            Registrar incidente vía frecuencia
          </h2>
        </header>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 py-5">
          <select
            value={tipoDelito}
            onChange={(e) => setTipoDelito(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
          >
            {DELITOS_RADIO.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={parroquia}
              onChange={(e) => setParroquia(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            >
              {PARROQUIAS_SAN_FRANCISCO.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={cuadrante}
              onChange={(e) => setCuadrante(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            >
              {SECTORES_REFERENCIA.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <textarea
            required
            minLength={10}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Relato de la patrulla por radio (mín. 10 caracteres)…"
            className="min-h-[110px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
          />

          {catalogs && (
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setSquadId('');
                }}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              >
                {catalogs.departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <select
                required
                value={squadId}
                onChange={(e) => setSquadId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              >
                <option value="">Escuadra despachada</option>
                {squads.map((squad) => (
                  <option key={squad.id} value={squad.id}>
                    {squad.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            {(['EN_TRANSITO', 'DESPACHADO'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setInitialStatus(status)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                  initialStatus === status
                    ? 'border-cyan-500/60 bg-cyan-950/40 text-cyan-200'
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !catalogs}
              className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-900/30 disabled:opacity-60"
            >
              {loading ? 'Despachando…' : 'Despachar al mapa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
