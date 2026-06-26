'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchIncidents } from '@/lib/api/incidents';
import type { Incident } from '@/lib/types/incident.types';
import { StatusBadge } from './status-badge';

interface IncidentListProps {
  onSelect: (incident: Incident) => void;
  onIncidentsChange?: (incidents: Incident[], loading: boolean) => void;
  refreshKey?: number;
  originFilter?: string;
}

const ORIGIN_LABELS: Record<string, string> = {
  ALL: 'Todos',
  INTERNO: 'Internos / patrullajes',
  PUBLICO_ANONIMO: 'Denuncias ciudadanas',
  PUBLICO_PANICO: 'Botón de pánico',
};

export function IncidentList({
  onSelect,
  onIncidentsChange,
  refreshKey = 0,
  originFilter = 'ALL',
}: IncidentListProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    onIncidentsChange?.([], true);

    try {
      const data = await fetchIncidents();
      setIncidents(data);
      onIncidentsChange?.(data, false);
    } catch {
      setError('No fue posible cargar el registro de incidentes');
      onIncidentsChange?.([], false);
    } finally {
      setLoading(false);
    }
  }, [onIncidentsChange]);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents, refreshKey]);

  const filteredIncidents = incidents.filter((incident) => {
    if (originFilter === 'ALL') return true;
    return (incident.origen ?? 'INTERNO') === originFilter;
  });

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900/30">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
            Sincronizando expedientes…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-6 py-8 text-center">
        <p className="text-sm text-red-200">{error}</p>
        <button
          type="button"
          onClick={() => void loadIncidents()}
          className="mt-4 rounded-lg border border-red-500/40 px-4 py-2 text-xs uppercase tracking-wider text-red-300 transition hover:bg-red-950/40"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (filteredIncidents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 px-6 py-16 text-center">
        <p className="text-sm font-medium text-slate-400">
          No hay incidentes en este filtro
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30 shadow-tactical">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-200">
          Registro de Incidentes Activos
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {filteredIncidents.length} expediente{filteredIncidents.length !== 1 ? 's' : ''}
          {originFilter !== 'ALL' ? ` · ${ORIGIN_LABELS[originFilter] ?? originFilter}` : ''}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-medium">Código</th>
              <th className="px-5 py-3 font-medium">Delito</th>
              <th className="px-5 py-3 font-medium">Parroquia</th>
              <th className="px-5 py-3 font-medium">Cuadrante</th>
              <th className="px-5 py-3 font-medium">Origen</th>
              <th className="px-5 py-3 font-medium">Estatus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredIncidents.map((incident) => (
              <tr
                key={incident.id}
                onClick={() => onSelect(incident)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(incident);
                  }
                }}
                tabIndex={0}
                role="button"
                className="cursor-pointer transition hover:bg-cyan-950/20 focus:bg-cyan-950/20 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-cyan-500/40"
              >
                <td className="px-5 py-3.5 font-mono text-xs text-cyan-300/90">
                  {incident.code}
                </td>
                <td className="px-5 py-3.5 text-slate-200">
                  {incident.tipoDelito}
                </td>
                <td className="px-5 py-3.5 text-slate-400">
                  {incident.parroquia}
                </td>
                <td className="px-5 py-3.5 text-slate-400">
                  {incident.cuadrante}
                </td>
                <td className="px-5 py-3.5 text-slate-400">
                  {(incident.origen ?? 'INTERNO').replace(/_/g, ' ')}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={incident.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export { IncidentList as default };
