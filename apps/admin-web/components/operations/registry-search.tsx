'use client';

import { useEffect, useState } from 'react';
import { searchRegistry, type RegistryHit } from '@/lib/api/registry';
import { REGISTRY_SOURCE_LABELS, VEHICLE_TYPES } from '@/lib/constants/vehicles';

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';

const MATCH_LABELS: Record<RegistryHit['matchedOn'], string> = {
  cedula: 'Cédula',
  placa: 'Placa / matrícula',
  serial: 'Serial / identificador',
};

interface RegistrySearchProps {
  title?: string;
  hint?: string;
  initialQuery?: string;
  compact?: boolean;
  onSelectHit?: (hit: RegistryHit) => void;
}

export function RegistrySearch({
  title = 'Buscador unificado',
  hint = 'Consulte cédula, placa, serial o matrícula en detenidos, minutas, denuncias, objetos recuperados e inventario.',
  initialQuery = '',
  compact = false,
  onSelectHit,
}: RegistrySearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<RegistryHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setHits([]);
      setSearched(false);
      setError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void searchRegistry(trimmed)
        .then((result) => {
          setHits(result.hits);
          setSearched(true);
        })
        .catch((err: unknown) => {
          setHits([]);
          setSearched(true);
          setError(err instanceof Error ? err.message : 'Error en la búsqueda');
        })
        .finally(() => setLoading(false));
    }, 450);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <section
      className={
        compact
          ? 'space-y-3'
          : 'rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4'
      }
    >
      {!compact && (
        <header>
          <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </header>
      )}

      <input
        className={inputCls}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cédula, placa, serial o matrícula…"
        aria-label="Búsqueda en registro unificado"
      />

      {loading && <p className="text-xs text-cyan-400/80">Consultando base operativa…</p>}
      {error && <p className="text-xs text-red-300">{error}</p>}

      {searched && !loading && !error && hits.length === 0 && query.trim().length >= 3 && (
        <p className="text-xs text-slate-500">
          Sin coincidencias para «{query.trim()}» en el registro consultado.
        </p>
      )}

      {hits.length > 0 && (
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {hits.map((hit) => (
            <li
              key={`${hit.source}-${hit.id}-${hit.matchedOn}`}
              className={`rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs ${
                onSelectHit ? 'cursor-pointer hover:border-cyan-700/50' : ''
              }`}
              onClick={() => onSelectHit?.(hit)}
              onKeyDown={(e) => {
                if (onSelectHit && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelectHit(hit);
                }
              }}
              role={onSelectHit ? 'button' : undefined}
              tabIndex={onSelectHit ? 0 : undefined}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-cyan-950/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                  {REGISTRY_SOURCE_LABELS[hit.source] ?? hit.source}
                </span>
                <span className="text-slate-500">
                  {MATCH_LABELS[hit.matchedOn]}: {hit.matchedValue}
                </span>
                {hit.code && (
                  <span className="font-mono text-slate-400">{hit.code}</span>
                )}
              </div>
              <p className="mt-1 font-medium text-slate-200">{hit.title}</p>
              <p className="mt-0.5 text-slate-500">{hit.summary}</p>
              <p className="mt-1 text-[10px] text-slate-600">
                {new Date(hit.occurredAt).toLocaleString('es-VE')}
                {hit.departmentName ? ` · ${hit.departmentName}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface MinuteVehicleRow {
  plate: string;
  vehicleType: string;
  ownerCedula: string;
  notes: string;
}

interface MinuteVehiclesEditorProps {
  vehicles: MinuteVehicleRow[];
  onChange: (vehicles: MinuteVehicleRow[]) => void;
}

export function MinuteVehiclesEditor({ vehicles, onChange }: MinuteVehiclesEditorProps) {
  function updateRow(index: number, patch: Partial<MinuteVehicleRow>) {
    onChange(vehicles.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([
      ...vehicles,
      { plate: '', vehicleType: 'AUTO', ownerCedula: '', notes: '' },
    ]);
  }

  function removeRow(index: number) {
    onChange(vehicles.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Vehículos (opcional)
        </p>
        <button
          type="button"
          className="rounded-md border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-300"
          onClick={addRow}
        >
          + Agregar vehículo
        </button>
      </div>
      {vehicles.length === 0 && (
        <p className="text-xs text-slate-600">Sin vehículos vinculados a esta minuta.</p>
      )}
      {vehicles.map((vehicle, index) => (
        <div key={index} className="grid gap-2 md:grid-cols-4 border-t border-slate-800 pt-2">
          <input
            className={inputCls}
            placeholder="Placa / matrícula"
            value={vehicle.plate}
            onChange={(e) => updateRow(index, { plate: e.target.value })}
          />
          <select
            className={inputCls}
            value={vehicle.vehicleType}
            onChange={(e) => updateRow(index, { vehicleType: e.target.value })}
          >
            {VEHICLE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            placeholder="Cédula titular (opc.)"
            value={vehicle.ownerCedula}
            onChange={(e) => updateRow(index, { ownerCedula: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              className={`${inputCls} flex-1`}
              placeholder="Notas"
              value={vehicle.notes}
              onChange={(e) => updateRow(index, { notes: e.target.value })}
            />
            <button
              type="button"
              className="rounded-md border border-red-900/60 px-2 text-xs text-red-300"
              onClick={() => removeRow(index)}
              aria-label="Quitar vehículo"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
