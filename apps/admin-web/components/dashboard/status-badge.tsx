import type { IncidentStatus } from '@/lib/types/incident.types';

const STATUS_CONFIG: Record<
  IncidentStatus,
  { label: string; className: string; pulse?: boolean }
> = {
  PENDIENTE: {
    label: 'Pendiente',
    className:
      'border-amber-500/40 bg-amber-950/40 text-amber-200',
  },
  DESPACHADO: {
    label: 'Despachado',
    className:
      'border-slate-500/40 bg-slate-800/60 text-slate-300',
  },
  EN_TRANSITO: {
    label: 'En Tránsito',
    className:
      'border-cyan-500/50 bg-cyan-950/50 text-cyan-300',
    pulse: true,
  },
  PENDIENTE_RESEÑA: {
    label: 'Pendiente Reseña',
    className:
      'border-orange-500/40 bg-orange-950/40 text-orange-200',
  },
  PROCESADO: {
    label: 'Procesado',
    className:
      'border-emerald-400/50 bg-emerald-950/50 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.25)]',
  },
  CERRADO: {
    label: 'Cerrado',
    className:
      'border-slate-600/40 bg-slate-900/60 text-slate-400',
  },
};

interface StatusBadgeProps {
  status: IncidentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${config.className} ${config.pulse ? 'animate-pulse' : ''}`}
    >
      {config.pulse && (
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden />
      )}
      {config.label}
    </span>
  );
}

export function getStatusLabel(status: IncidentStatus): string {
  return STATUS_CONFIG[status].label;
}
