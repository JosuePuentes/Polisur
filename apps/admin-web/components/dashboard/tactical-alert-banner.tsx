'use client';

import type { TacticalSocketIncident } from '@/lib/constants/tactical-socket';

interface TacticalAlertBannerProps {
  alert: TacticalSocketIncident | null;
  onDismiss: () => void;
}

export function TacticalAlertBanner({
  alert,
  onDismiss,
}: TacticalAlertBannerProps) {
  if (!alert) {
    return null;
  }

  const isPanic = alert.tipoDelito === 'ALERTA_BOTON_PANICO';

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        isPanic
          ? 'border-red-500/50 bg-red-950/40 text-red-100'
          : 'border-cyan-500/40 bg-cyan-950/30 text-cyan-100'
      }`}
      role="alert"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider">
          {isPanic ? 'Alerta botón de pánico' : 'Nuevo incidente ciudadano'}
        </p>
        <p className="mt-1 text-sm">
          <span className="font-mono">{alert.code}</span> · {alert.cuadrante} ·{' '}
          {alert.tipoDelito}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs uppercase tracking-wider transition hover:bg-white/10"
      >
        Entendido
      </button>
    </div>
  );
}
