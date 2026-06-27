'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAnalyticsOverview, type AnalyticsOverview } from '@/lib/api/analytics';
import { useTacticalSocket } from '@/lib/hooks/use-tactical-socket';

const REFRESH_MS = 30_000;

function KpiCard({
  label,
  value,
  hint,
  accent = 'text-slate-100',
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: string;
}) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-4 shadow-tactical">
      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${accent}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </article>
  );
}

function BarChart({
  title,
  items,
  valueKey = 'total',
  labelKey = 'label',
}: {
  title: string;
  items: Array<Record<string, string | number>>;
  valueKey?: string;
  labelKey?: string;
}) {
  const max = Math.max(1, ...items.map((item) => Number(item[valueKey] ?? 0)));

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
      <div className="mt-4 flex h-48 items-end gap-2">
        {items.map((item) => {
          const value = Number(item[valueKey] ?? 0);
          const height = `${Math.max(4, (value / max) * 100)}%`;
          const label = String(item[labelKey] ?? item.date ?? item.month ?? '');
          return (
            <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-slate-400">{value}</span>
              <div
                className="w-full rounded-t bg-gradient-to-t from-cyan-900 to-cyan-500/80"
                style={{ height }}
                title={`${label}: ${value}`}
              />
              <span className="truncate text-[9px] text-slate-500">{label.slice(-5)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ComparisonChart({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  const colors = ['bg-cyan-500', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500'];

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-300">{item.label}</span>
              <span className="tabular-nums text-slate-500">{item.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${colors[index % colors.length]}`}
                style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-500">Sin datos en el período.</p>}
      </div>
    </section>
  );
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const overview = await fetchAnalyticsOverview();
      setData(overview);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los indicadores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useTacticalSocket({
    enabled: true,
    onIncidentCreated: () => void load(),
    onPanicAlert: () => void load(),
  });

  if (loading && !data) {
    return <p className="text-sm text-slate-500">Cargando panel ejecutivo…</p>;
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const recentMinutaDays = data.minutasByDay.slice(-14).map((item) => ({
    ...item,
    label: item.date.slice(5),
  }));

  const recentDetaineeDays = data.detaineesByDay.slice(-14).map((item) => ({
    ...item,
    label: item.date.slice(5),
  }));

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900/80 to-slate-900/40 px-6 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-500/80">
          Panel ejecutivo
        </p>
        <h1 className="mt-2 text-lg font-semibold text-slate-100">Indicadores operativos</h1>
        <p className="mt-1 text-sm text-slate-400">
          {data.scopeLabel} · actualización automática cada 30 s
          {lastRefresh ? ` · última lectura ${lastRefresh.toLocaleTimeString()}` : ''}
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Funcionarios registrados"
          value={data.kpis.officersRegistered}
          hint="Personal operativo en RRHH"
        />
        <KpiCard
          label="Funcionarios activos"
          value={data.kpis.officersActive}
          hint="Con usuario habilitado"
          accent="text-emerald-400"
        />
        <KpiCard
          label="Minutas hoy"
          value={data.kpis.minutasToday}
          hint={`${data.kpis.minutasThisMonth} en el mes`}
          accent="text-cyan-400"
        />
        <KpiCard
          label="Patrullajes hoy"
          value={data.kpis.patrolsToday}
          hint="Minutas + patrullajes + mixtos"
        />
        <KpiCard
          label="Armas asignadas"
          value={data.kpis.activeWeapons}
          hint="Parque de armas activo"
          accent="text-amber-400"
        />
        <KpiCard
          label="Patrullas asignadas"
          value={data.kpis.activePatrolAssets}
          hint="Logística operativa"
        />
        <KpiCard
          label="Detenidos hoy"
          value={data.kpis.detaineesToday}
          hint={`${data.kpis.detaineesThisMonth} ingresos en el mes`}
          accent="text-orange-400"
        />
        <KpiCard
          label="En calabozos"
          value={data.kpis.detaineesInCustody}
          hint={`${data.kpis.shiftsActiveToday} guardias activas hoy`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BarChart title="Minutas y patrullajes — últimos 14 días" items={recentMinutaDays} />
        <BarChart
          title="Minutas y patrullajes — por mes"
          items={data.minutasByMonth}
          labelKey="label"
        />
        <BarChart title="Detenidos ingresados — últimos 14 días" items={recentDetaineeDays} />
        <BarChart
          title="Detenidos ingresados — por mes"
          items={data.detaineesByMonth}
          labelKey="label"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ComparisonChart
          title="Comparación de procedimientos (mes actual)"
          items={data.proceduresByType}
        />
        <ComparisonChart title="Incidentes por estatus" items={data.incidentsByStatus} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Casos abiertos" value={data.kpis.incidentsOpen} accent="text-violet-400" />
        <KpiCard label="Guardias activas hoy" value={data.kpis.shiftsActiveToday} />
        <KpiCard
          label="Total patrullajes del mes"
          value={data.minutasByMonth.at(-1)?.total ?? 0}
        />
      </div>
    </div>
  );
}
