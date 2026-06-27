'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { fetchIncidents } from '@/lib/api/incidents';
import { proceduresApi } from '@/lib/api/procedures';
import { opsApi } from '@/lib/api/operations';
import { AuthenticatedDetaineePhoto } from '@/components/operations/authenticated-detainee-photo';
import { RegistrySearch } from '@/components/operations/registry-search';
import type { Incident } from '@/lib/types/incident.types';

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';
const btnCls = 'rounded-lg bg-cyan-700 px-3 py-2 text-sm text-white disabled:opacity-50';

interface DetentionCell {
  id: string;
  code: string;
  name: string;
  block: string | null;
  _count?: { detainees: number };
}

interface DetaineePhoto {
  id: string;
  kind: string;
  label: string | null;
  publicUrl: string;
  isPrimary: boolean;
}

interface DetaineeListItem {
  id: string;
  cedula: string | null;
  nombres: string;
  apellidos: string;
  status: string;
  isConvicted: boolean;
  sentenceYears: number | null;
  detentionCell: DetentionCell | null;
  photos: DetaineePhoto[];
  _count: { hearings: number; records: number };
}

type ConvictionFilter = 'all' | 'convicted' | 'not_convicted';
type StatusFilter = '' | 'EN_TRANSITO' | 'EN_CALABOZO';

const PHOTO_FIELDS = [
  { key: 'photo_front', label: 'Frente (carnet)' },
  { key: 'photo_left', label: 'Perfil izquierdo' },
  { key: 'photo_right', label: 'Perfil derecho' },
  { key: 'photo_back', label: 'Espalda' },
  { key: 'photo_doc_1', label: 'Documento / custodia 1' },
  { key: 'photo_doc_2', label: 'Documento / custodia 2' },
] as const;

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-500/80">
          SITOP
        </p>
        <h1 className="mt-2 text-lg font-semibold text-slate-100">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </header>
      {children}
    </div>
  );
}

function primaryPhoto(detainee: DetaineeListItem): DetaineePhoto | undefined {
  return (
    detainee.photos.find((p) => p.isPrimary) ??
    detainee.photos.find((p) => p.kind === 'FRONT') ??
    detainee.photos[0]
  );
}

function DetaineeCard({
  detainee,
  selected,
  onSelect,
}: {
  detainee: DetaineeListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const photo = primaryPhoto(detainee);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full gap-4 rounded-xl border p-4 text-left transition ${
        selected
          ? 'border-cyan-500/40 bg-cyan-950/20'
          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
      }`}
    >
      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-700">
        {photo ? (
          <AuthenticatedDetaineePhoto
            publicUrl={photo.publicUrl}
            alt={`${detainee.nombres} ${detainee.apellidos}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-950 text-[10px] text-slate-500">
            Sin foto
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-100">
          {detainee.nombres} {detainee.apellidos}
        </p>
        <p className="text-xs text-slate-400">
          Cédula: {detainee.cedula ?? 'N/D'}
        </p>
        <p className="mt-1 text-xs text-cyan-300/90">
          {detainee.status === 'EN_TRANSITO'
            ? 'En tránsito — pendiente ingreso a celda'
            : `Celda: ${detainee.detentionCell?.name ?? 'Sin asignar'}`}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-slate-500">
          <span>{detainee._count.records} antecedentes</span>
          <span>{detainee._count.hearings} audiencias</span>
          <span
            className={
              detainee.isConvicted ? 'text-red-400' : 'text-emerald-400/90'
            }
          >
            {detainee.isConvicted
              ? `Condenado${detainee.sentenceYears ? ` · ${detainee.sentenceYears} años` : ''}`
              : 'Sin condena'}
          </span>
        </div>
      </div>
    </button>
  );
}

export function DetaineesPanel() {
  const [cells, setCells] = useState<DetentionCell[]>([]);
  const [list, setList] = useState<DetaineeListItem[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<DetaineeListItem | null>(null);
  const [convictionFilter, setConvictionFilter] =
    useState<ConvictionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [cellFilter, setCellFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [cellForm, setCellForm] = useState({ code: '', name: '', block: '' });
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    detentionCellId: '',
    delitoInicial: '',
    incidentId: '',
    isConvicted: false,
    sentenceYears: '',
  });
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [hearing, setHearing] = useState({
    fecha: '',
    tribunal: '',
    resultado: '',
    isConvicted: false,
    sentenceYears: '',
  });
  const [transitAdmit, setTransitAdmit] = useState({
    detentionCellId: '',
    delitoInicial: '',
    nombres: '',
    apellidos: '',
    cedula: '',
    alias: '',
    notas: '',
  });

  const listParams = useMemo(() => {
    const params: { convicted?: boolean; cellId?: string; status?: string } = {};
    if (convictionFilter === 'convicted') params.convicted = true;
    if (convictionFilter === 'not_convicted') params.convicted = false;
    if (cellFilter) params.cellId = cellFilter;
    if (statusFilter) params.status = statusFilter;
    return params;
  }, [convictionFilter, cellFilter, statusFilter]);

  function reload() {
    void opsApi.listDetainees(listParams).then((rows) => setList(rows as DetaineeListItem[]));
  }

  useEffect(() => {
    reload();
  }, [listParams]);

  useEffect(() => {
    void opsApi.listDetentionCells().then((rows) => {
      const parsed = rows as DetentionCell[];
      setCells(parsed);
      if (!form.detentionCellId && parsed[0]) {
        setForm((f) => ({ ...f, detentionCellId: parsed[0].id }));
      }
    });
    void fetchIncidents().then(setIncidents).catch(() => setIncidents([]));
  }, []);

  async function handleCreateCell(e: FormEvent) {
    e.preventDefault();
    await opsApi.createDetentionCell({
      code: cellForm.code,
      name: cellForm.name,
      block: cellForm.block || undefined,
    });
    setCellForm({ code: '', name: '', block: '' });
    const rows = (await opsApi.listDetentionCells()) as DetentionCell[];
    setCells(rows);
    setMsg('Celda registrada');
  }

  async function handleCreateDetainee(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('nombres', form.nombres);
    fd.append('apellidos', form.apellidos);
    if (form.cedula) fd.append('cedula', form.cedula);
    if (form.detentionCellId) fd.append('detentionCellId', form.detentionCellId);
    if (form.delitoInicial) fd.append('delitoInicial', form.delitoInicial);
    if (form.incidentId) fd.append('incidentId', form.incidentId);
    fd.append('isConvicted', String(form.isConvicted));
    if (form.sentenceYears) fd.append('sentenceYears', form.sentenceYears);

    for (const field of PHOTO_FIELDS) {
      const file = photos[field.key];
      if (file) fd.append(field.key, file);
    }

    const created = (await opsApi.createDetaineeForm(fd)) as DetaineeListItem;
    setForm({
      nombres: '',
      apellidos: '',
      cedula: '',
      detentionCellId: form.detentionCellId,
      delitoInicial: '',
      incidentId: '',
      isConvicted: false,
      sentenceYears: '',
    });
    setPhotos({});
    setSelected(created);
    setMsg('Detenido registrado con reseña fotográfica');
    reload();
  }

  return (
    <Shell
      title="Detenidos y Calabozos"
      subtitle="Celdas, reseña fotográfica y preliminares en tránsito desde procedimientos en curso."
    >
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}

      <form
        onSubmit={(e) => void handleCreateCell(e)}
        className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5 md:grid-cols-4"
      >
        <h2 className="md:col-span-4 text-sm font-semibold text-slate-200">
          Registrar nueva celda
        </h2>
        <input
          required
          className={inputCls}
          placeholder="Código (CELDA-C1)"
          value={cellForm.code}
          onChange={(e) => setCellForm({ ...cellForm, code: e.target.value })}
        />
        <input
          required
          className={inputCls}
          placeholder="Nombre visible"
          value={cellForm.name}
          onChange={(e) => setCellForm({ ...cellForm, name: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Bloque / ala"
          value={cellForm.block}
          onChange={(e) => setCellForm({ ...cellForm, block: e.target.value })}
        />
        <button type="submit" className={btnCls}>
          Crear celda
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {(['all', 'convicted', 'not_convicted'] as ConvictionFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setConvictionFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs ${
              convictionFilter === f
                ? 'bg-cyan-900/40 text-cyan-300'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {f === 'all'
              ? 'Todos'
              : f === 'convicted'
                ? 'Condenados'
                : 'Sin condena'}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'EN_TRANSITO' ? '' : 'EN_TRANSITO')}
          className={`rounded-lg px-3 py-1.5 text-xs ${
            statusFilter === 'EN_TRANSITO'
              ? 'bg-amber-900/40 text-amber-300'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          En tránsito
        </button>
        <select
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300"
          value={cellFilter}
          onChange={(e) => setCellFilter(e.target.value)}
        >
          <option value="">Todas las celdas</option>
          {cells.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c._count?.detainees ?? 0})
            </option>
          ))}
        </select>
      </div>

      <form
        onSubmit={(e) => void handleCreateDetainee(e)}
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5"
      >
        <h2 className="text-sm font-semibold text-slate-200">
          Ingresar detenido + reseña
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            required
            className={inputCls}
            placeholder="Nombres"
            value={form.nombres}
            onChange={(e) => setForm({ ...form, nombres: e.target.value })}
          />
          <input
            required
            className={inputCls}
            placeholder="Apellidos"
            value={form.apellidos}
            onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Cédula"
            value={form.cedula}
            onChange={(e) => setForm({ ...form, cedula: e.target.value })}
          />
          {form.cedula.trim().length >= 3 && (
            <div className="md:col-span-2">
              <RegistrySearch compact initialQuery={form.cedula.trim()} />
            </div>
          )}
          <select
            required
            className={inputCls}
            value={form.detentionCellId}
            onChange={(e) =>
              setForm({ ...form, detentionCellId: e.target.value })
            }
          >
            <option value="">Seleccione celda</option>
            {cells.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.block ? `· ${c.block}` : ''}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            placeholder="Delito inicial"
            value={form.delitoInicial}
            onChange={(e) =>
              setForm({ ...form, delitoInicial: e.target.value })
            }
          />
          <select
            className={inputCls}
            value={form.incidentId}
            onChange={(e) => setForm({ ...form, incidentId: e.target.value })}
          >
            <option value="">Sin incidente vinculado</option>
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.code} — {inc.tipoDelito}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.isConvicted}
              onChange={(e) =>
                setForm({ ...form, isConvicted: e.target.checked })
              }
            />
            Ya condenado al ingreso
          </label>
          <input
            className={inputCls}
            placeholder="Años de condena (si aplica)"
            type="number"
            min={0}
            step={0.5}
            value={form.sentenceYears}
            onChange={(e) =>
              setForm({ ...form, sentenceYears: e.target.value })
            }
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PHOTO_FIELDS.map((field) => (
            <label key={field.key} className="block text-xs text-slate-400">
              {field.label}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="mt-1 block w-full text-xs text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-slate-200"
                onChange={(e) =>
                  setPhotos((prev) => ({
                    ...prev,
                    [field.key]: e.target.files?.[0] ?? null,
                  }))
                }
              />
            </label>
          ))}
        </div>

        <button type="submit" className={btnCls}>
          Ingresar detenido
        </button>
      </form>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          {list.map((d) => (
            <DetaineeCard
              key={d.id}
              detainee={d}
              selected={selected?.id === d.id}
              onSelect={() =>
                void opsApi
                  .getDetainee(d.id)
                  .then((r) => setSelected(r as DetaineeListItem))
              }
            />
          ))}
          {list.length === 0 && (
            <p className="text-sm text-slate-500">No hay detenidos en este filtro.</p>
          )}
        </div>

        {selected && (
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex gap-4">
              <div className="h-36 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-700">
                {primaryPhoto(selected) ? (
                  <AuthenticatedDetaineePhoto
                    publicUrl={primaryPhoto(selected)!.publicUrl}
                    alt="Foto carnet"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    Sin foto
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  {selected.nombres} {selected.apellidos}
                </h3>
                <p className="text-sm text-slate-400">
                  Cédula: {selected.cedula ?? 'N/D'}
                </p>
                <p className="text-sm text-cyan-300">
                  Celda: {selected.detentionCell?.name ?? 'Sin asignar'}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {selected._count.records} antecedentes ·{' '}
                  {selected._count.hearings} audiencias
                </p>
                <p
                  className={`mt-1 text-xs font-medium ${
                    selected.isConvicted ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {selected.isConvicted
                    ? `Condenado${selected.sentenceYears ? ` · ${selected.sentenceYears} años` : ''}`
                    : 'Sin condena registrada'}
                </p>
              </div>
            </div>

            {selected.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {selected.photos.map((photo) => (
                  <div key={photo.id} className="space-y-1">
                    <AuthenticatedDetaineePhoto
                      publicUrl={photo.publicUrl}
                      alt={photo.label ?? photo.kind}
                      className="h-20 w-full rounded object-cover"
                    />
                    <p className="text-[10px] text-slate-500">{photo.label ?? photo.kind}</p>
                  </div>
                ))}
              </div>
            )}

            {selected.status === 'EN_TRANSITO' && (
              <form
                className="space-y-2 border-t border-slate-800 pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void proceduresApi
                    .admitTransit(selected.id, {
                      detentionCellId: transitAdmit.detentionCellId,
                      delitoInicial: transitAdmit.delitoInicial,
                      nombres: transitAdmit.nombres || undefined,
                      apellidos: transitAdmit.apellidos || undefined,
                      cedula: transitAdmit.cedula || undefined,
                      alias: transitAdmit.alias || undefined,
                      notas: transitAdmit.notas || undefined,
                    })
                    .then(() => {
                      setMsg('Detenido admitido en calabozo');
                      reload();
                      setSelected(null);
                    });
                }}
              >
                <h4 className="text-xs font-semibold uppercase text-amber-300">
                  Ingreso desde tránsito
                </h4>
                <p className="text-xs text-slate-500">
                  El expediente y fijaciones ya vienen del procedimiento. Confirme celda, delito y datos.
                </p>
                <select
                  required
                  className={inputCls}
                  value={transitAdmit.detentionCellId}
                  onChange={(e) =>
                    setTransitAdmit({ ...transitAdmit, detentionCellId: e.target.value })
                  }
                >
                  <option value="">Asignar celda</option>
                  {cells.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  required
                  className={inputCls}
                  placeholder="Delito (confirmar o rectificar)"
                  value={transitAdmit.delitoInicial}
                  onChange={(e) =>
                    setTransitAdmit({ ...transitAdmit, delitoInicial: e.target.value })
                  }
                />
                <input
                  className={inputCls}
                  placeholder="Nombres (rectificar)"
                  value={transitAdmit.nombres}
                  onChange={(e) =>
                    setTransitAdmit({ ...transitAdmit, nombres: e.target.value })
                  }
                />
                <input
                  className={inputCls}
                  placeholder="Apellidos (rectificar)"
                  value={transitAdmit.apellidos}
                  onChange={(e) =>
                    setTransitAdmit({ ...transitAdmit, apellidos: e.target.value })
                  }
                />
                <input
                  className={inputCls}
                  placeholder="Cédula (rectificar)"
                  value={transitAdmit.cedula}
                  onChange={(e) =>
                    setTransitAdmit({ ...transitAdmit, cedula: e.target.value })
                  }
                />
                <button type="submit" className={btnCls}>
                  Confirmar ingreso a calabozo
                </button>
              </form>
            )}

            {selected.status !== 'EN_TRANSITO' && (
            <form
              className="space-y-2 border-t border-slate-800 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                void opsApi
                  .addHearing(selected.id, {
                    ...hearing,
                    isConvicted: hearing.isConvicted,
                    sentenceYears: hearing.sentenceYears
                      ? Number(hearing.sentenceYears)
                      : undefined,
                  })
                  .then((r) => {
                    setSelected(r as DetaineeListItem);
                    reload();
                  });
              }}
            >
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Registrar audiencia
              </h4>
              <input
                type="date"
                required
                className={inputCls}
                value={hearing.fecha}
                onChange={(e) => setHearing({ ...hearing, fecha: e.target.value })}
              />
              <input
                required
                className={inputCls}
                placeholder="Tribunal"
                value={hearing.tribunal}
                onChange={(e) =>
                  setHearing({ ...hearing, tribunal: e.target.value })
                }
              />
              <input
                className={inputCls}
                placeholder="Resultado"
                value={hearing.resultado}
                onChange={(e) =>
                  setHearing({ ...hearing, resultado: e.target.value })
                }
              />
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={hearing.isConvicted}
                  onChange={(e) =>
                    setHearing({ ...hearing, isConvicted: e.target.checked })
                  }
                />
                Condenado en esta audiencia
              </label>
              <input
                className={inputCls}
                placeholder="Años de condena"
                type="number"
                min={0}
                step={0.5}
                value={hearing.sentenceYears}
                onChange={(e) =>
                  setHearing({ ...hearing, sentenceYears: e.target.value })
                }
              />
              <button type="submit" className={btnCls}>
                Guardar audiencia
              </button>
            </form>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
