'use client';

import { FormEvent, useRef, useState } from 'react';
import { submitPublicDenuncia } from '@/lib/api/public-incidents';
import {
  PARROQUIAS_SAN_FRANCISCO,
  SECTORES_REFERENCIA,
  TIPOS_DELITO_PUBLICOS,
} from '@/lib/constants/public-portal';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export function AnonymousReportForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [delito, setDelito] = useState<string>(TIPOS_DELITO_PUBLICOS[0]);
  const [parroquia, setParroquia] = useState<string>(PARROQUIAS_SAN_FRANCISCO[0]);
  const [sector, setSector] = useState<string>(SECTORES_REFERENCIA[3]);
  const [descripcion, setDescripcion] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setFeedback(null);
    setReferenceCode(null);

    const files = fileInputRef.current?.files
      ? Array.from(fileInputRef.current.files).slice(0, 3)
      : [];

    try {
      const result = await submitPublicDenuncia({
        delito,
        parroquia,
        sector,
        descripcion,
        evidencias: files,
      });

      setStatus('success');
      setReferenceCode(result.code);
      setFeedback(result.message);
      setDescripcion('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setStatus('error');
      setFeedback(
        error instanceof Error
          ? error.message
          : 'No fue posible enviar la denuncia.',
      );
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          Denuncia Anónima
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Su identidad no será solicitada. La información llegará al despacho
          central de Polisur en San Francisco.
        </p>
      </header>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Tipo de delito
            </span>
            <select
              value={delito}
              onChange={(event) => setDelito(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              required
            >
              {TIPOS_DELITO_PUBLICOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Parroquia
            </span>
            <select
              value={parroquia}
              onChange={(event) => setParroquia(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              required
            >
              {PARROQUIAS_SAN_FRANCISCO.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Sector / Cuadrante de referencia
          </span>
          <select
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            required
          >
            {SECTORES_REFERENCIA.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Relato de los hechos
          </span>
          <textarea
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            minLength={10}
            maxLength={4000}
            rows={5}
            placeholder="Describa lo ocurrido con el mayor detalle posible…"
            className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            required
          />
          <span className="mt-1 block text-xs text-slate-500">
            Mínimo 10 caracteres · {descripcion.length}/4000
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Evidencia fotográfica (opcional)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            multiple
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Hasta 3 fotos desde la cámara del dispositivo (JPG, PNG, WebP).
          </span>
        </label>

        {feedback && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              status === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {feedback}
            {referenceCode && (
              <p className="mt-1 font-mono text-xs">
                Referencia: {referenceCode}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'submitting'
            ? 'Enviando denuncia…'
            : 'Enviar denuncia anónima'}
        </button>
      </form>
    </section>
  );
}
