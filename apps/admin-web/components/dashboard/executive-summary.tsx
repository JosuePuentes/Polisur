import type { Incident } from '@/lib/types/incident.types';
import type { OfficerSession } from '@/lib/types/auth.types';

interface ExecutiveSummaryProps {
  incidents: Incident[];
  session: OfficerSession;
  loading?: boolean;
}

function countByStatus(incidents: Incident[], status: string): number {
  return incidents.filter((i) => i.status === status).length;
}

export function ExecutiveSummary({
  incidents,
  session,
  loading,
}: ExecutiveSummaryProps) {
  const scopeLabel = resolveScopeLabel(session, incidents);

  const metrics = [
    { label: 'Casos Totales', value: incidents.length, accent: 'text-slate-100' },
    {
      label: 'En Tránsito',
      value: countByStatus(incidents, 'EN_TRANSITO'),
      accent: 'text-cyan-400',
    },
    {
      label: 'Pendientes por Reseña',
      value: countByStatus(incidents, 'PENDIENTE_RESEÑA'),
      accent: 'text-orange-400',
    },
    {
      label: 'Procesados',
      value: countByStatus(incidents, 'PROCESADO'),
      accent: 'text-emerald-400',
    },
  ];

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900/80 to-slate-900/40 px-5 py-4 backdrop-blur-sm">
        {session.rangeRole === 'SUPER_ADMIN' ? (
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-cyan-400">
            Vista Global de Polisur
          </p>
        ) : (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Ámbito operativo
            </p>
            <p className="mt-1 text-sm font-medium text-slate-200">{scopeLabel}</p>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-4 shadow-tactical"
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {metric.label}
            </p>
            <p
              className={`mt-2 text-3xl font-semibold tabular-nums ${metric.accent}`}
            >
              {loading ? '—' : metric.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function resolveScopeLabel(
  session: OfficerSession,
  incidents: Incident[],
): string {
  if (session.rangeRole === 'JEFE_DEPARTAMENTO') {
    const dept = incidents.find((i) => i.departmentId === session.departmentId)
      ?.department;
    return dept?.name ?? `Comando · ${session.departmentId.slice(0, 8)}…`;
  }

  if (session.rangeRole === 'OFICIAL_ACTIVO') {
    const squad = incidents.find((i) => i.squadId === session.squadId)?.squad;
    return squad?.name ?? 'Escuadra asignada';
  }

  return session.rangeRole.replace(/_/g, ' ');
}
