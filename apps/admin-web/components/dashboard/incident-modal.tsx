'use client';

import { AuthenticatedEvidenceImage } from '@/components/dashboard/authenticated-evidence-image';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { uploadEvidence } from '@/lib/api/incidents';
import { generateFiscalReport } from '@/lib/utils/pdf-generator';
import type { EvidenceStage, Incident } from '@/lib/types/incident.types';
import { StatusBadge } from './status-badge';

interface IncidentModalProps {
  incident: Incident | null;
  onClose: () => void;
  onEvidenceUploaded?: () => void;
}

const RETORNO_CALLE_LIMIT = 3;
const RESENA_COMANDO_LIMIT = 1;

export function IncidentModal({
  incident,
  onClose,
  onEvidenceUploaded,
}: IncidentModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localEvidence, setLocalEvidence] = useState(incident?.evidence ?? []);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setLocalEvidence(incident?.evidence ?? []);
    setUploadError(null);
    setExportError(null);
  }, [incident]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    if (incident) {
      document.addEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [incident, onClose]);

  const retornoCount = useMemo(
    () => localEvidence.filter((e) => e.stage === 'RETORNO_CALLE').length,
    [localEvidence],
  );

  const resenaCount = useMemo(
    () => localEvidence.filter((e) => e.stage === 'RESEÑA_COMANDO').length,
    [localEvidence],
  );

  const isProcessed = incident?.status === 'PROCESADO';
  const isImmutable = isProcessed || incident?.status === 'CERRADO';
  const canUpload =
    !isImmutable &&
    (incident?.status === 'PENDIENTE' ||
      incident?.status === 'PENDIENTE_RESEÑA' ||
      incident?.status === 'EN_TRANSITO' ||
      incident?.status === 'DESPACHADO');

  const nextStage = useMemo((): EvidenceStage | null => {
    if (retornoCount < RETORNO_CALLE_LIMIT) return 'RETORNO_CALLE';
    if (resenaCount < RESENA_COMANDO_LIMIT) return 'RESEÑA_COMANDO';
    return null;
  }, [retornoCount, resenaCount]);

  const simulateUpload = useCallback(
    async (file: File) => {
      if (!incident || !canUpload || !nextStage) return;

      setUploading(true);
      setUploadError(null);

      const objectUrl = URL.createObjectURL(file);

      try {
        const created = await uploadEvidence({
          incidentId: incident.id,
          file,
          stage: nextStage,
          descripcion: `Evidencia táctica: ${file.name}`,
        });

        setLocalEvidence((prev) => [...prev, created]);
        onEvidenceUploaded?.();
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : 'Error al subir evidencia',
        );
      } finally {
        setUploading(false);
        URL.revokeObjectURL(objectUrl);
      }
    },
    [incident, canUpload, nextStage, onEvidenceUploaded],
  );

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      void simulateUpload(file);
    }
  }

  async function handleExportPdf() {
    if (!incident) return;
    setExportingPdf(true);
    setExportError(null);
    try {
      await generateFiscalReport({ ...incident, evidence: localEvidence });
    } catch {
      setExportError('No fue posible generar el acta para Fiscalía');
    } finally {
      setExportingPdf(false);
    }
  }

  if (!incident) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-modal-title"
    >
      <button
        type="button"
        aria-label="Cerrar expediente"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-tactical-lg">
        {/* Encabezado expediente */}
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Expediente Fiscal · SITOP
            </p>
            <h2
              id="incident-modal-title"
              className="mt-1 font-mono text-lg font-semibold text-cyan-300"
            >
              {incident.code}
            </h2>
            <div className="mt-2">
              <StatusBadge status={incident.status} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isProcessed && (
              <button
                type="button"
                onClick={() => void handleExportPdf()}
                disabled={exportingPdf}
                className="rounded-lg border border-slate-600 bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-100 shadow-md transition hover:from-slate-600 hover:to-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingPdf
                  ? 'Generando acta…'
                  : '📥 Exportar Acta para Fiscalía'}
              </button>
            )}
            {exportError && (
              <p className="max-w-[220px] text-right text-[11px] text-red-400">
                {exportError}
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
            >
              Cerrar
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isImmutable && (
            <div className="relative mb-6 overflow-hidden rounded-xl border-2 border-emerald-500/40 bg-emerald-950/30 px-6 py-8 text-center">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20"
              >
                <span className="rotate-[-12deg] border-4 border-emerald-500 px-8 py-4 font-mono text-2xl font-bold uppercase tracking-widest text-emerald-500">
                  Expediente Inmutable
                </span>
              </div>
              <p className="relative font-mono text-sm font-bold uppercase tracking-[0.25em] text-emerald-400">
                Expediente Inmutable — Enviado a Fiscalía
              </p>
            </div>
          )}

          {/* Datos del caso */}
          <section className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Tipo de Delito', value: incident.tipoDelito },
              { label: 'Parroquia', value: incident.parroquia },
              { label: 'Cuadrante', value: incident.cuadrante },
              { label: 'Departamento', value: incident.department.name },
              { label: 'Escuadra Actuante', value: incident.squad.name },
              {
                label: 'Registrado',
                value: new Date(incident.createdAt).toLocaleString('es-VE'),
              },
            ].map((field) => (
              <div
                key={field.label}
                className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3"
              >
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  {field.label}
                </p>
                <p className="mt-1 text-sm text-slate-200">{field.value}</p>
              </div>
            ))}
          </section>

          <section className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Descripción del Procedimiento
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {incident.descripcion}
            </p>
          </section>

          {/* Anexo fotográfico */}
          <section className="mt-6">
            <h3 className="text-sm font-semibold text-slate-200">
              Anexo Fotográfico de Evidencias
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Calle: {retornoCount}/{RETORNO_CALLE_LIMIT} · Comando:{' '}
              {resenaCount}/{RESENA_COMANDO_LIMIT}
            </p>

            {localEvidence.length > 0 ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {localEvidence.map((ev) => (
                  <li
                    key={ev.id}
                    className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50"
                  >
                    <div className="flex aspect-video items-center justify-center bg-slate-900">
                      <AuthenticatedEvidenceImage
                        imageUrl={ev.imageUrl}
                        alt={ev.descripcion ?? 'Evidencia'}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="px-3 py-2">
                      <p className="font-mono text-[10px] uppercase text-cyan-500/80">
                        {ev.stage.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {ev.descripcion ?? 'Sin descripción'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Sin evidencias registradas en este expediente.
              </p>
            )}

            {canUpload && nextStage && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`mt-4 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                  dragOver
                    ? 'border-cyan-500/60 bg-cyan-950/20'
                    : 'border-slate-700 bg-slate-950/30'
                }`}
              >
                <p className="text-sm text-slate-300">
                  Arrastre una imagen para simular la carga
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Próxima etapa:{' '}
                  <span className="text-cyan-400">
                    {nextStage.replace(/_/g, ' ')}
                  </span>
                </p>
                <label className="mt-4 inline-block cursor-pointer rounded-lg border border-cyan-600/40 bg-cyan-950/30 px-4 py-2 text-xs uppercase tracking-wider text-cyan-300 transition hover:border-cyan-500/60">
                  Seleccionar archivo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void simulateUpload(file);
                    }}
                  />
                </label>
                {uploading && (
                  <p className="mt-3 font-mono text-xs text-slate-500">
                    Registrando evidencia…
                  </p>
                )}
                {uploadError && (
                  <p className="mt-3 text-xs text-red-400">{uploadError}</p>
                )}
              </div>
            )}

            {canUpload && !nextStage && (
              <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-300">
                Paquete fotográfico completo. El caso puede transicionar a
                PROCESADO desde el módulo operativo.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
