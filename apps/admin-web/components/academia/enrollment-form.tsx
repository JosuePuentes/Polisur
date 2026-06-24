'use client';

import { FormEvent, useEffect, useState } from 'react';
import { registerDiscente } from '@/lib/api/academy';
import type { Promocion } from '@/lib/types/academy.types';

interface EnrollmentFormProps {
  promociones: Promocion[];
  departmentId: string;
  onEnrolled: () => void;
}

export function EnrollmentForm({
  promociones,
  departmentId,
  onEnrolled,
}: EnrollmentFormProps) {
  const [cedula, setCedula] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [promocionId, setPromocionId] = useState(
    promociones[0]?.id ?? '',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (promociones.length > 0 && !promociones.some((p) => p.id === promocionId)) {
      setPromocionId(promociones[0].id);
    }
  }, [promociones, promocionId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const discente = await registerDiscente({
        cedula: cedula.trim(),
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        departmentId,
        promocionId,
      });

      setSuccess(
        `Aspirante ${discente.nombres} ${discente.apellidos} inscrito correctamente en la cohorte.`,
      );
      setCedula('');
      setNombres('');
      setApellidos('');
      onEnrolled();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Credenciales inválidas o acceso denegado',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20';

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 shadow-tactical backdrop-blur-sm">
      <header className="mb-6">
        <h2 className="text-sm font-semibold text-slate-100">
          Inscripción de Nuevos Discentes
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Registro de aspirantes vinculados a cohorte activa
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {success && (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200"
          >
            {success}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="cedula"
            className="block text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Cédula de Identidad
          </label>
          <input
            id="cedula"
            required
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="V-12345678"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="nombres"
            className="block text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Nombres
          </label>
          <input
            id="nombres"
            required
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="apellidos"
            className="block text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Apellidos
          </label>
          <input
            id="apellidos"
            required
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="promocionId"
            className="block text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Promoción (Cohorte)
          </label>
          <select
            id="promocionId"
            required
            value={promocionId}
            onChange={(e) => setPromocionId(e.target.value)}
            className={inputClass}
          >
            {promociones.length === 0 ? (
              <option value="">Sin cohortes activas</option>
            ) : (
              promociones.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombreCurso}
                </option>
              ))
            )}
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !promocionId}
          className="w-full rounded-lg border border-cyan-600/40 bg-gradient-to-r from-slate-800 to-polisur-accent px-4 py-3 text-xs font-semibold uppercase tracking-widest text-cyan-50 transition hover:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Registrando aspirante…' : 'Inscribir Aspirante'}
        </button>
      </form>
    </section>
  );
}
