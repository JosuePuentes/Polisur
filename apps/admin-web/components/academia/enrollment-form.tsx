'use client';

import { FormEvent, useEffect, useState } from 'react';
import { registerDiscenteForm } from '@/lib/api/academy';
import { RegistrySearch } from '@/components/operations/registry-search';
import {
  BLOOD_TYPES,
  BODY_BUILDS,
  DISCENTE_FILE_SLOTS,
  SKIN_COLORS,
} from '@/lib/constants/academy';
import type { Promocion } from '@/lib/types/academy.types';

interface EnrollmentFormProps {
  promociones: Promocion[];
  departmentId: string;
  onEnrolled: () => void;
}

const emptyForm = {
  cedula: '',
  nombres: '',
  apellidos: '',
  direccion: '',
  telefono: '',
  tipoSangre: BLOOD_TYPES[0] as string,
  alturaCm: '',
  pesoKg: '',
  colorPiel: SKIN_COLORS[0] as string,
  contextura: BODY_BUILDS[1] as string,
};

export function EnrollmentForm({
  promociones,
  departmentId,
  onEnrolled,
}: EnrollmentFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [promocionId, setPromocionId] = useState(promociones[0]?.id ?? '');
  const [files, setFiles] = useState<Record<string, File | null>>({});
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
      const payload = new FormData();
      payload.set('cedula', form.cedula.trim());
      payload.set('nombres', form.nombres.trim());
      payload.set('apellidos', form.apellidos.trim());
      payload.set('departmentId', departmentId);
      payload.set('promocionId', promocionId);
      payload.set('direccion', form.direccion.trim());
      payload.set('telefono', form.telefono.trim());
      payload.set('tipoSangre', form.tipoSangre);
      if (form.alturaCm) payload.set('alturaCm', form.alturaCm);
      if (form.pesoKg) payload.set('pesoKg', form.pesoKg);
      payload.set('colorPiel', form.colorPiel);
      payload.set('contextura', form.contextura);

      for (const slot of DISCENTE_FILE_SLOTS) {
        const file = files[slot.key];
        if (file) payload.set(slot.key, file);
      }

      const discente = await registerDiscenteForm(payload);

      setSuccess(
        `Aspirante ${discente.nombres} ${discente.apellidos} inscrito con expediente completo (${discente.discenteDocuments?.length ?? 0} adjuntos).`,
      );
      setForm(emptyForm);
      setFiles({});
      onEnrolled();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar la inscripción del discente',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20';

  const attachedCount = Object.values(files).filter(Boolean).length;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 shadow-tactical backdrop-blur-sm">
      <header className="mb-6">
        <h2 className="text-sm font-semibold text-slate-100">
          Inscripción de Nuevos Discentes
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Datos personales, perfil físico y hasta 6 archivos o imágenes del expediente
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="cedula" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Cédula de identidad
            </label>
            <input
              id="cedula"
              required
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
              placeholder="V-12345678"
              className={inputClass}
            />
            {form.cedula.trim().length >= 3 && (
              <RegistrySearch
                compact
                initialQuery={form.cedula.trim()}
                hint="Verifique si la cédula ya tiene registros en minutas, detenidos o denuncias."
              />
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="telefono" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Teléfono
            </label>
            <input
              id="telefono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="0414-0000000"
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="nombres" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Nombres
            </label>
            <input
              id="nombres"
              required
              value={form.nombres}
              onChange={(e) => setForm({ ...form, nombres: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="apellidos" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Apellidos
            </label>
            <input
              id="apellidos"
              required
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="direccion" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
            Dirección
          </label>
          <input
            id="direccion"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            placeholder="Sector, calle, municipio"
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="tipoSangre" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Tipo de sangre
            </label>
            <select
              id="tipoSangre"
              value={form.tipoSangre}
              onChange={(e) => setForm({ ...form, tipoSangre: e.target.value })}
              className={inputClass}
            >
              {BLOOD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="alturaCm" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Altura (cm)
            </label>
            <input
              id="alturaCm"
              type="number"
              min={100}
              max={250}
              value={form.alturaCm}
              onChange={(e) => setForm({ ...form, alturaCm: e.target.value })}
              placeholder="175"
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="pesoKg" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Peso (kg)
            </label>
            <input
              id="pesoKg"
              type="number"
              min={30}
              max={250}
              value={form.pesoKg}
              onChange={(e) => setForm({ ...form, pesoKg: e.target.value })}
              placeholder="78"
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="colorPiel" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Color de piel
            </label>
            <select
              id="colorPiel"
              value={form.colorPiel}
              onChange={(e) => setForm({ ...form, colorPiel: e.target.value })}
              className={inputClass}
            >
              {SKIN_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="contextura" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Contextura
            </label>
            <select
              id="contextura"
              value={form.contextura}
              onChange={(e) => setForm({ ...form, contextura: e.target.value })}
              className={inputClass}
            >
              {BODY_BUILDS.map((build) => (
                <option key={build} value={build}>
                  {build}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="promocionId" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Promoción (cohorte)
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
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Archivos o imágenes del expediente (hasta 6)
          </p>
          <p className="mt-1 text-xs text-slate-500">
            JPG, PNG, WebP o PDF · máximo 8 MB por archivo
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {DISCENTE_FILE_SLOTS.map((slot) => (
              <div key={slot.key} className="space-y-1">
                <label className="text-xs text-slate-500">{slot.label}</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:text-slate-200"
                  onChange={(e) =>
                    setFiles((prev) => ({
                      ...prev,
                      [slot.key]: e.target.files?.[0] ?? null,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-cyan-300/80">{attachedCount} archivo(s) seleccionado(s)</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !promocionId}
          className="w-full rounded-lg border border-cyan-600/40 bg-gradient-to-r from-slate-800 to-polisur-accent px-4 py-3 text-xs font-semibold uppercase tracking-widest text-cyan-50 transition hover:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Registrando aspirante…' : 'Inscribir aspirante con expediente'}
        </button>
      </form>
    </section>
  );
}
