'use client';

import { useEffect, useState } from 'react';
import { graduatePromocion } from '@/lib/api/academy';
import type { GraduatePromocionResult, Promocion } from '@/lib/types/academy.types';

interface PromocionCardProps {
  promocion: Promocion;
  onGraduated: (result: GraduatePromocionResult) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function PromocionCard({ promocion, onGraduated }: PromocionCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isGraduating, setIsGraduating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompleted = promocion.totalDiscentes === 0;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowConfirm(false);
    }
    if (showConfirm) {
      document.addEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [showConfirm]);

  async function handleConfirmGraduation() {
    setIsGraduating(true);
    setError(null);

    try {
      const result = await graduatePromocion(promocion.id);
      setShowConfirm(false);
      onGraduated(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'La graduación no pudo completarse',
      );
    } finally {
      setIsGraduating(false);
    }
  }

  return (
    <>
      <article
        className={`rounded-xl border bg-slate-900/40 p-6 shadow-tactical backdrop-blur-sm ${
          isCompleted
            ? 'border-emerald-500/30 opacity-80'
            : 'border-slate-800'
        }`}
      >
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Cohorte Activa
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-100">
              {promocion.nombreCurso}
            </h3>
          </div>
          {isCompleted && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              Culminada
            </span>
          )}
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Egreso Estimado
            </p>
            <p className="mt-1 text-sm text-orange-300/90">
              {formatDate(promocion.fechaFinEstimada)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Alumnos Inscritos
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-cyan-300">
              {promocion.totalDiscentes}
            </p>
          </div>
        </div>

        {promocion.discentes.length > 0 && (
          <ul className="mt-5 space-y-2">
            {promocion.discentes.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-sm"
              >
                <span className="text-slate-300">
                  {d.apellidos}, {d.nombres}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {d.cedula}
                </span>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="mt-4 text-xs text-red-400" role="alert">
            {error}
          </p>
        )}

        {!isCompleted && (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-amber-600 to-red-600 px-4 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg transition hover:from-amber-500 hover:to-red-500 hover:shadow-[0_0_24px_rgba(239,68,68,0.35)]"
          >
            Disparar Graduación Institucional
          </button>
        )}
      </article>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="graduate-confirm-title"
        >
          <button
            type="button"
            aria-label="Cancelar"
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            onClick={() => !isGraduating && setShowConfirm(false)}
          />

          <div className="relative z-10 w-full max-w-md rounded-xl border border-amber-500/30 bg-slate-900 p-6 shadow-tactical-lg">
            <h4
              id="graduate-confirm-title"
              className="font-mono text-sm font-semibold uppercase tracking-wider text-amber-400"
            >
              Confirmación Técnica Requerida
            </h4>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Esta operación es irreversible. Elevará el rango de todos los
              discentes a{' '}
              <span className="font-semibold text-cyan-300">Oficial Activo</span>{' '}
              y los transferirá a la bandeja de distribución de RRHH.
            </p>
            <p className="mt-3 font-mono text-xs text-slate-500">
              Cohorte: {promocion.nombreCurso} · {promocion.totalDiscentes}{' '}
              discente(s)
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isGraduating}
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-xs uppercase tracking-wider text-slate-400 transition hover:border-slate-600 hover:text-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isGraduating}
                onClick={() => void handleConfirmGraduation()}
                className="flex-1 rounded-lg bg-gradient-to-r from-amber-600 to-red-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:from-amber-500 hover:to-red-500 disabled:opacity-60"
              >
                {isGraduating ? 'Procesando…' : 'Confirmar Graduación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
