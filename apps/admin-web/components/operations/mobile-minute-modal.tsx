'use client';

import { FormEvent, useEffect, useState } from 'react';
import { opsApi } from '@/lib/api/operations';
import { getSession } from '@/lib/auth';

const inputCls =
  'w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100';

interface MobileMinuteModalProps {
  open: boolean;
  onClose: () => void;
  departmentId: string;
  squadId: string | null;
  gps: { lat: number; lng: number } | null;
  onSuccess: (message: string) => void;
}

export function MobileMinuteModal({
  open,
  onClose,
  departmentId,
  squadId,
  gps,
  onSuccess,
}: MobileMinuteModalProps) {
  const session = getSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [conceptos, setConceptos] = useState<string[]>([]);
  const [asuntos, setAsuntos] = useState<string[]>([]);
  const [quadrants, setQuadrants] = useState<
    Array<{ id: string; code: string; parroquia: string }>
  >([]);
  const [reseñaPrefix, setReseñaPrefix] = useState('');
  const [lema, setLema] = useState('');

  const [form, setForm] = useState({
    peaceQuadrantId: '',
    lugar: '',
    concepto: '',
    asunto: '',
    descripcion: '',
    accionesTomadas: 'Resguardo del sitio\nPresencia policial.',
  });

  useEffect(() => {
    if (!open || !departmentId) return;
    void Promise.all([
      opsApi.getMinuteConfig(departmentId),
      opsApi.listMinuteCatalog('CONCEPTO'),
      opsApi.listMinuteCatalog('ASUNTO'),
      opsApi.listQuadrants(),
    ]).then(([config, conceptList, asuntoList, quadrantList]) => {
      setReseñaPrefix(config.reseñaPrefix);
      setLema(config.lema);
      setConceptos(conceptList.map((c) => c.label));
      setAsuntos(asuntoList.map((a) => a.label));
      setQuadrants(
        quadrantList.map((q) => ({ id: q.id, code: q.code, parroquia: q.parroquia })),
      );
      if (quadrantList[0]) {
        setForm((f) => ({ ...f, peaceQuadrantId: quadrantList[0].id }));
      }
    });
  }, [open, departmentId]);

  if (!open) return null;

  const selectedQuadrant = quadrants.find((q) => q.id === form.peaceQuadrantId);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session?.id) return;

    setError('');
    setSubmitting(true);

    const fd = new FormData();
    fd.set('patrolType', 'MINUTA');
    fd.set('departmentId', departmentId);
    fd.set('parroquia', selectedQuadrant?.parroquia ?? 'San Francisco');
    fd.set('cuadrante', selectedQuadrant?.code ?? '—');
    if (squadId) fd.set('squadId', squadId);
    if (form.peaceQuadrantId) fd.set('peaceQuadrantId', form.peaceQuadrantId);
    if (form.lugar.trim()) fd.set('lugar', form.lugar.trim());
    if (form.concepto) fd.set('concepto', form.concepto);
    if (form.asunto) fd.set('asunto', form.asunto);
    fd.set('reseñaPrefix', reseñaPrefix);
    fd.set('descripcion', form.descripcion.trim());
    if (form.accionesTomadas.trim()) fd.set('accionesTomadas', form.accionesTomadas.trim());
    if (lema.trim()) fd.set('lema', lema.trim());
    fd.set('eventAt', new Date().toISOString());
    fd.set('officerIds', JSON.stringify([session.id]));
    if (gps) {
      fd.set('latitude', String(gps.lat));
      fd.set('longitude', String(gps.lng));
    }

    try {
      await opsApi.createPatrol(fd);
      onSuccess('Minuta registrada — procedimiento en curso abierto');
      setForm({
        peaceQuadrantId: quadrants[0]?.id ?? '',
        lugar: '',
        concepto: '',
        asunto: '',
        descripcion: '',
        accionesTomadas: 'Resguardo del sitio\nPresencia policial.',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la minuta');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-100">Realizar minuta</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400"
          >
            Cerrar
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <select
            className={inputCls}
            value={form.peaceQuadrantId}
            onChange={(e) => setForm((f) => ({ ...f, peaceQuadrantId: e.target.value }))}
          >
            {quadrants.map((q) => (
              <option key={q.id} value={q.id}>
                {q.code} · {q.parroquia}
              </option>
            ))}
          </select>

          <input
            className={inputCls}
            placeholder="Lugar (calle, referencia)"
            value={form.lugar}
            onChange={(e) => setForm((f) => ({ ...f, lugar: e.target.value }))}
          />

          <select
            className={inputCls}
            value={form.concepto}
            onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
            required
          >
            <option value="">Concepto…</option>
            {conceptos.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>

          <select
            className={inputCls}
            value={form.asunto}
            onChange={(e) => setForm((f) => ({ ...f, asunto: e.target.value }))}
            required
          >
            <option value="">Asunto…</option>
            {asuntos.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>

          <textarea
            required
            minLength={20}
            className={`${inputCls} min-h-[120px] text-sm`}
            placeholder="Reseña de los hechos…"
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          />

          <textarea
            className={`${inputCls} min-h-[80px] text-sm`}
            placeholder="Acciones tomadas"
            value={form.accionesTomadas}
            onChange={(e) => setForm((f) => ({ ...f, accionesTomadas: e.target.value }))}
          />

          {gps ? (
            <p className="font-mono text-xs text-cyan-500/80">
              GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
            </p>
          ) : (
            <p className="text-xs text-amber-400">Sin GPS — la minuta se enviará sin coordenadas</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-cyan-600 py-4 text-base font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Registrando…' : 'Registrar minuta de salida'}
          </button>
        </form>
      </div>
    </div>
  );
}
