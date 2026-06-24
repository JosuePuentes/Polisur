'use client';

import { useState } from 'react';
import { submitPanicAlert } from '@/lib/api/public-incidents';

type PanicStatus = 'idle' | 'locating' | 'sending' | 'success' | 'error';

export function PanicButton() {
  const [status, setStatus] = useState<PanicStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);

  async function handlePanicPress() {
    if (status === 'locating' || status === 'sending') {
      return;
    }

    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('Su dispositivo no soporta geolocalización GPS.');
      return;
    }

    setStatus('locating');
    setMessage('Obteniendo ubicación GPS…');
    setReferenceCode(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStatus('sending');
        setMessage('Transmitiendo alerta al despacho central…');

        try {
          const result = await submitPanicAlert({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
          });

          setStatus('success');
          setMessage(result.message);
          setReferenceCode(result.code);
        } catch (error) {
          setStatus('error');
          setMessage(
            error instanceof Error
              ? error.message
              : 'No fue posible enviar la alerta de pánico.',
          );
        }
      },
      (geoError) => {
        setStatus('error');
        setMessage(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Debe autorizar el acceso a la ubicación para activar el botón de pánico.'
            : 'No fue posible obtener su ubicación GPS.',
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0,
      },
    );
  }

  const isActive = status === 'success';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-slate-900">
          Botón de Pánico Ciudadano
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Use solo en emergencias reales. La comisión más cercana será
          despachada de inmediato.
        </p>
      </header>

      <div className="flex flex-col items-center gap-6">
        <button
          type="button"
          onClick={() => void handlePanicPress()}
          disabled={status === 'locating' || status === 'sending'}
          aria-label="Activar botón de pánico"
          className={`relative flex h-44 w-44 items-center justify-center rounded-full border-4 text-center transition sm:h-52 sm:w-52 ${
            isActive
              ? 'border-emerald-500 bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
              : 'border-red-300 bg-red-600 text-white shadow-xl shadow-red-500/40 hover:bg-red-700 active:scale-95'
          } disabled:cursor-not-allowed disabled:opacity-80`}
        >
          <span className="px-4 text-base font-bold uppercase leading-tight tracking-wide sm:text-lg">
            {status === 'success'
              ? 'Alerta Enviada'
              : status === 'locating' || status === 'sending'
                ? 'Enviando…'
                : 'Botón de Pánico'}
          </span>
          {!isActive && status !== 'locating' && status !== 'sending' && (
            <span className="absolute inset-0 animate-ping rounded-full border-2 border-red-400 opacity-20" />
          )}
        </button>

        {message && (
          <div
            className={`w-full max-w-md rounded-xl px-4 py-3 text-center text-sm ${
              status === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : status === 'error'
                  ? 'border border-red-200 bg-red-50 text-red-800'
                  : 'border border-blue-200 bg-blue-50 text-blue-800'
            }`}
          >
            <p>{message}</p>
            {status === 'success' && (
              <p className="mt-2 font-semibold">Comisión en camino</p>
            )}
            {referenceCode && (
              <p className="mt-1 font-mono text-xs">Código: {referenceCode}</p>
            )}
          </div>
        )}

        <p className="max-w-md text-center text-xs text-slate-500">
          Al presionar, se solicitará permiso de ubicación. El sistema asignará
          automáticamente el Cuadrante de Paz más cercano.
        </p>
      </div>
    </section>
  );
}
