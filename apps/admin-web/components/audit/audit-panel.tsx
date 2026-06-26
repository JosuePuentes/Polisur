'use client';

import { useEffect, useState } from 'react';
import { fetchAuditLogs, type AuditLogRow } from '@/lib/api/audit';

const inputCls = 'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';

export function AuditPanel() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('');
  const [successOnly, setSuccessOnly] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload(p = page) {
    setLoading(true);
    setError(null);
    void fetchAuditLogs({
      page: p,
      limit: 40,
      severity: severity || undefined,
      success: successOnly === '' ? undefined : successOnly === 'true',
    })
      .then((res) => {
        setLogs(res.items);
        setTotal(res.total);
        setPage(res.page);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar auditoría'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { reload(1); }, [severity, successOnly]);

  const severityColor: Record<string, string> = {
    INFO: 'text-slate-400',
    WARNING: 'text-amber-400',
    CRITICAL: 'text-red-400',
  };

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-500/80">Forense</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-100">Auditoría del Sistema</h1>
        <p className="mt-1 text-sm text-slate-400">Trazas inmutables de acciones HTTP y eventos críticos. Solo lectura.</p>
      </header>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">{error}</div>}

      <div className="flex flex-wrap gap-2">
        <select className={inputCls} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">Todas las severidades</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
        <select className={inputCls} value={successOnly} onChange={(e) => setSuccessOnly(e.target.value)}>
          <option value="">Éxito y fallos</option>
          <option value="true">Solo exitosos</option>
          <option value="false">Solo fallidos</option>
        </select>
        <button type="button" onClick={() => reload(page)} className="rounded-lg bg-cyan-800 px-3 py-2 text-sm text-white">Actualizar</button>
      </div>

      <p className="text-xs text-slate-500">{total} registros · página {page}</p>

      {loading && <p className="text-sm text-slate-500">Cargando…</p>}

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`font-semibold uppercase ${severityColor[log.severity] ?? 'text-slate-400'}`}>{log.severity}</span>
              <span className="text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 font-mono text-cyan-400/90">{log.httpMethod} {log.endpointUrl}</p>
            {log.actionLabel && <p className="text-slate-300">{log.actionLabel}</p>}
            <p className="text-slate-500">
              {log.officer ? `${log.officer.nombres} ${log.officer.apellidos} (${log.officer.cedula})` : 'Sin funcionario'}
              {' · '}IP {log.clientIp} · HTTP {log.statusCode}
              {log.durationMs != null ? ` · ${log.durationMs}ms` : ''}
              {!log.success && log.errorMessage ? ` · ${log.errorMessage}` : ''}
            </p>
            <p className="font-mono text-[10px] text-slate-600">trace {log.traceId}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => reload(page - 1)} className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400 disabled:opacity-40">Anterior</button>
        <button type="button" disabled={page * 40 >= total} onClick={() => reload(page + 1)} className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400 disabled:opacity-40">Siguiente</button>
      </div>
    </div>
  );
}
