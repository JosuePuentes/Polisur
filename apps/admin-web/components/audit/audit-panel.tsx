'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchAuditCatalogs,
  fetchAuditLogs,
  type AuditCatalogModule,
  type AuditLogRow,
} from '@/lib/api/audit';

const inputCls =
  'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';

const QUICK_FILTERS = [
  { label: 'Transferencias RRHH', module: 'RRHH', action: 'OFFICER_TRANSFER' },
  { label: 'Asignaciones RRHH', module: 'RRHH', action: 'OFFICER_ASSIGN' },
  { label: 'Minutas / patrullaje', module: 'PATROL', action: 'PATROL_CREATE' },
  { label: 'Logística', module: 'LOGISTICS' },
  { label: 'Parque de armas', module: 'ARMORY' },
  { label: 'Guardias', module: 'SHIFTS' },
  { label: 'Detenidos', module: 'DETAINEES' },
  { label: 'Incidentes', module: 'INCIDENTS' },
] as const;

export function AuditPanel() {
  const [catalogs, setCatalogs] = useState<AuditCatalogModule[]>([]);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('');
  const [successOnly, setSuccessOnly] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [httpMethod, setHttpMethod] = useState('');
  const [mutationsOnly, setMutationsOnly] = useState(true);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actionOptions = useMemo(() => {
    if (!module) {
      return catalogs.flatMap((item) => item.actions);
    }
    return catalogs.find((item) => item.id === module)?.actions ?? [];
  }, [catalogs, module]);

  function reload(p = page) {
    setLoading(true);
    setError(null);
    void fetchAuditLogs({
      page: p,
      limit: 40,
      severity: severity || undefined,
      success: successOnly === '' ? undefined : successOnly === 'true',
      module: module || undefined,
      action: action || undefined,
      httpMethod: httpMethod || undefined,
      mutationsOnly,
      q: q || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((res) => {
        setLogs(res.items);
        setTotal(res.total);
        setPage(res.page);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar auditoría'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void fetchAuditCatalogs()
      .then((data) => setCatalogs(data.modules))
      .catch(() => setCatalogs([]));
  }, []);

  useEffect(() => {
    reload(1);
  }, [severity, successOnly, module, action, httpMethod, mutationsOnly, q, dateFrom, dateTo]);

  function applyQuickFilter(filter: (typeof QUICK_FILTERS)[number]) {
    setModule(filter.module);
    setAction('action' in filter ? filter.action : '');
    setMutationsOnly(true);
    setPage(1);
  }

  function clearFilters() {
    setSeverity('');
    setSuccessOnly('');
    setModule('');
    setAction('');
    setHttpMethod('');
    setMutationsOnly(true);
    setQ('');
    setSearchInput('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  const severityColor: Record<string, string> = {
    INFO: 'text-slate-400',
    WARNING: 'text-amber-400',
    CRITICAL: 'text-red-400',
  };

  const moduleLabel = (log: AuditLogRow) => {
    const id = log.metadata?.module;
    if (!id) return null;
    return catalogs.find((item) => item.id === id)?.label ?? id;
  };

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-500/80">
          Forense
        </p>
        <h1 className="mt-2 text-lg font-semibold text-slate-100">Auditoría del Sistema</h1>
        <p className="mt-1 text-sm text-slate-400">
          Registro completo de operaciones: transferencias, asignaciones, minutas, guardias,
          logística, armas y más. Use los filtros para localizar eventos por módulo o acción.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-sm font-semibold text-slate-200">Filtros</h2>

        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => applyQuickFilter(filter)}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <select
            className={inputCls}
            value={module}
            onChange={(e) => {
              setModule(e.target.value);
              setAction('');
            }}
          >
            <option value="">Todos los módulos</option>
            {catalogs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            className={inputCls}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            disabled={actionOptions.length === 0}
          >
            <option value="">Todas las acciones</option>
            {actionOptions.map((item) => (
              <option key={`${item.action}-${item.label}`} value={item.action}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            className={inputCls}
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="">Todas las severidades</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          <select
            className={inputCls}
            value={successOnly}
            onChange={(e) => setSuccessOnly(e.target.value)}
          >
            <option value="">Éxito y fallos</option>
            <option value="true">Solo exitosos</option>
            <option value="false">Solo fallidos</option>
          </select>

          <select
            className={inputCls}
            value={httpMethod}
            onChange={(e) => setHttpMethod(e.target.value)}
          >
            <option value="">Cualquier método HTTP</option>
            <option value="POST">POST (altas / registros)</option>
            <option value="PATCH">PATCH (cambios)</option>
            <option value="GET">GET (consultas)</option>
            <option value="INTERNAL">INTERNAL (críticos)</option>
          </select>

          <input
            type="date"
            className={inputCls}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="Desde"
          />
          <input
            type="date"
            className={inputCls}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="Hasta"
          />

          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={mutationsOnly}
              onChange={(e) => setMutationsOnly(e.target.checked)}
            />
            Solo operaciones de escritura
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setQ(searchInput.trim());
                setPage(1);
              }
            }}
            placeholder="Buscar por funcionario, cédula, acción, endpoint o trace"
            className={`${inputCls} min-w-[260px] flex-1`}
          />
          <button
            type="button"
            onClick={() => {
              setQ(searchInput.trim());
              setPage(1);
            }}
            className="rounded-lg bg-cyan-800 px-3 py-2 text-sm text-white"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => reload(page)}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        {total} registros · página {page}
        {mutationsOnly ? ' · mostrando solo escrituras' : ''}
      </p>

      {loading && <p className="text-sm text-slate-500">Cargando…</p>}

      <div className="space-y-2">
        {logs.map((log) => {
          const moduleName = moduleLabel(log);
          const isExpanded = expandedId === log.id;
          return (
            <div key={log.id} className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`font-semibold uppercase ${severityColor[log.severity] ?? 'text-slate-400'}`}
                  >
                    {log.severity}
                  </span>
                  {moduleName && (
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-300">
                      {moduleName}
                    </span>
                  )}
                  {!log.success && (
                    <span className="rounded bg-red-950/50 px-2 py-0.5 text-[10px] text-red-300">
                      Fallido
                    </span>
                  )}
                </div>
                <span className="text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
              </div>

              <p className="mt-1 text-sm font-medium text-slate-100">
                {log.actionLabel ?? 'Operación sin clasificar'}
              </p>
              <p className="font-mono text-cyan-400/80">
                {log.httpMethod} {log.endpointUrl}
              </p>
              <p className="text-slate-500">
                {log.officer
                  ? `${log.officer.apellidos}, ${log.officer.nombres} · C.I. ${log.officer.cedula}`
                  : 'Sin funcionario identificado'}
                {' · '}IP {log.clientIp} · HTTP {log.statusCode}
                {log.durationMs != null ? ` · ${log.durationMs}ms` : ''}
                {!log.success && log.errorMessage ? ` · ${log.errorMessage}` : ''}
              </p>
              <p className="font-mono text-[10px] text-slate-600">trace {log.traceId}</p>

              {(log.requestBody || log.routeParams || log.queryParams) && (
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="mt-2 text-[11px] text-cyan-500 hover:text-cyan-300"
                >
                  {isExpanded ? 'Ocultar detalle' : 'Ver detalle de la operación'}
                </button>
              )}

              {isExpanded && (
                <div className="mt-2 space-y-1 rounded border border-slate-800 bg-slate-950/60 p-2 font-mono text-[10px] text-slate-400">
                  {log.routeParams && (
                    <p>
                      <span className="text-slate-500">params:</span>{' '}
                      {JSON.stringify(log.routeParams)}
                    </p>
                  )}
                  {log.queryParams && (
                    <p>
                      <span className="text-slate-500">query:</span>{' '}
                      {JSON.stringify(log.queryParams)}
                    </p>
                  )}
                  {log.requestBody && (
                    <p>
                      <span className="text-slate-500">body:</span> {JSON.stringify(log.requestBody)}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!loading && logs.length === 0 && (
          <p className="text-sm text-slate-500">Sin registros para los filtros seleccionados.</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => reload(page - 1)}
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400 disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={page * 40 >= total}
          onClick={() => reload(page + 1)}
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400 disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
