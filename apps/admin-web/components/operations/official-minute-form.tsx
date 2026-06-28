'use client';

import { useEffect, useMemo, useState } from 'react';
import { opsApi } from '@/lib/api/operations';
import { MinuteVehiclesEditor } from '@/components/operations/registry-search';

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';
const btnCls = 'rounded-lg bg-cyan-700 px-3 py-2 text-sm text-white disabled:opacity-50';
const MAX_PHOTOS = 20;

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type OfficerOption = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  departmentId?: string;
};

type QuadrantOption = {
  id: string;
  code: string;
  name: string;
  parroquia: string;
};

type DepartmentOption = {
  id: string;
  name: string;
  squads?: Array<{ id: string; name: string }>;
};

interface OfficialMinuteFormProps {
  departments: DepartmentOption[];
  officers: OfficerOption[];
  quadrants: QuadrantOption[];
  defaultDepartmentId: string;
  isSuperAdmin: boolean;
  onSuccess: (message: string) => void;
}

export function OfficialMinuteForm({
  departments,
  officers,
  quadrants,
  defaultDepartmentId,
  isSuperAdmin,
  onSuccess,
}: OfficialMinuteFormProps) {
  const now = useMemo(() => new Date(), []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const [headerLines, setHeaderLines] = useState<string[]>([]);
  const [divisionName, setDivisionName] = useState('');
  const [reseñaPrefix, setReseñaPrefix] = useState('');
  const [lema, setLema] = useState('');
  const [editHeader, setEditHeader] = useState(false);
  const [editReseñaPrefix, setEditReseñaPrefix] = useState(false);
  const [editLema, setEditLema] = useState(false);

  const [conceptos, setConceptos] = useState<Array<{ label: string }>>([]);
  const [asuntos, setAsuntos] = useState<Array<{ label: string }>>([]);
  const [newConcepto, setNewConcepto] = useState('');
  const [newAsunto, setNewAsunto] = useState('');

  const [photos, setPhotos] = useState<File[]>([]);
  const [minuteVehicles, setMinuteVehicles] = useState<
    Array<{ plate: string; vehicleType: string; ownerCedula: string; notes: string }>
  >([]);

  const [form, setForm] = useState({
    patrolType: 'MINUTA',
    departmentId: defaultDepartmentId,
    squadId: '',
    peaceQuadrantId: '',
    lugar: '',
    concepto: '',
    asunto: '',
    descripcion: '',
    accionesTomadas: 'Resguardo del sitio\nPresencia policial.',
    unidades: 'Particular.',
    eventAt: toLocalDatetimeValue(now),
    officerIds: [] as string[],
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const squads = departments.find((d) => d.id === form.departmentId)?.squads ?? [];

  const departmentOfficers = useMemo(
    () => officers.filter((o) => !form.departmentId || o.departmentId === form.departmentId),
    [officers, form.departmentId],
  );

  const selectedQuadrant = quadrants.find((q) => q.id === form.peaceQuadrantId);

  useEffect(() => {
    if (!form.departmentId) return;
    void Promise.all([
      opsApi.getMinuteConfig(form.departmentId),
      opsApi.listMinuteCatalog('CONCEPTO'),
      opsApi.listMinuteCatalog('ASUNTO'),
    ]).then(([config, conceptList, asuntoList]) => {
      setHeaderLines(config.headerLines);
      setDivisionName(config.divisionName);
      setReseñaPrefix(config.reseñaPrefix);
      setLema(config.lema);
      setConceptos(conceptList.map((c) => ({ label: c.label })));
      setAsuntos(asuntoList.map((a) => ({ label: a.label })));
    });
  }, [form.departmentId]);

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsStatus('Este dispositivo no soporta geolocalización.');
      return;
    }
    setGpsStatus('Obteniendo ubicación…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((f) => ({
          ...f,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setGpsStatus('Ubicación registrada.');
      },
      () => setGpsStatus('No se pudo obtener la ubicación GPS.'),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  async function addCatalogEntry(kind: 'CONCEPTO' | 'ASUNTO', label: string) {
    const trimmed = label.trim();
    if (trimmed.length < 3) return;
    await opsApi.addMinuteCatalog({ kind, label: trimmed });
    const list = await opsApi.listMinuteCatalog(kind);
    if (kind === 'CONCEPTO') {
      setConceptos(list.map((c) => ({ label: c.label })));
      setForm((f) => ({ ...f, concepto: trimmed }));
      setNewConcepto('');
    } else {
      setAsuntos(list.map((a) => ({ label: a.label })));
      setForm((f) => ({ ...f, asunto: trimmed }));
      setNewAsunto('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const officerIds =
      form.officerIds.length > 0
        ? form.officerIds
        : departmentOfficers.slice(0, 1).map((o) => o.id);

    if (!officerIds.length) {
      setError('Debe seleccionar al menos un funcionario actuante.');
      setSubmitting(false);
      return;
    }

    const fd = new FormData();
    fd.set('patrolType', form.patrolType);
    fd.set('departmentId', form.departmentId);
    fd.set('parroquia', selectedQuadrant?.parroquia ?? 'San Francisco');
    fd.set('cuadrante', selectedQuadrant?.code ?? '—');
    if (form.squadId) fd.set('squadId', form.squadId);
    if (form.peaceQuadrantId) fd.set('peaceQuadrantId', form.peaceQuadrantId);
    if (form.lugar.trim()) fd.set('lugar', form.lugar.trim());
    if (form.concepto) fd.set('concepto', form.concepto);
    if (form.asunto) fd.set('asunto', form.asunto);
    fd.set('reseñaPrefix', reseñaPrefix);
    fd.set('descripcion', form.descripcion.trim());
    if (form.accionesTomadas.trim()) fd.set('accionesTomadas', form.accionesTomadas.trim());
    if (form.unidades.trim()) fd.set('unidades', form.unidades.trim());
    if (lema.trim()) fd.set('lema', lema.trim());
    fd.set('eventAt', new Date(form.eventAt).toISOString());
    fd.set('officerIds', JSON.stringify(officerIds));
    if (form.latitude != null) fd.set('latitude', String(form.latitude));
    if (form.longitude != null) fd.set('longitude', String(form.longitude));

    const vehicles = minuteVehicles
      .filter((v) => v.plate.trim().length >= 3)
      .map((v) => ({
        plate: v.plate.trim(),
        vehicleType: v.vehicleType,
        ownerCedula: v.ownerCedula.trim() || undefined,
        notes: v.notes.trim() || undefined,
      }));
    if (vehicles.length) fd.set('vehicles', JSON.stringify(vehicles));

    for (const file of photos) {
      fd.append('minute_photos', file);
    }

    try {
      await opsApi.createPatrol(fd);
      onSuccess('Minuta de salida registrada — procedimiento en curso abierto');
      setForm((f) => ({
        ...f,
        descripcion: '',
        lugar: '',
        latitude: null,
        longitude: null,
        officerIds: [],
      }));
      setPhotos([]);
      setMinuteVehicles([]);
      setGpsStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la minuta');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5"
      onSubmit={(e) => void handleSubmit(e)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-200">Minuta de salida — formato oficial</h2>
        <button
          type="button"
          className="text-[10px] uppercase tracking-wider text-cyan-500/80"
          onClick={() => setEditHeader((v) => !v)}
        >
          {editHeader ? 'Ocultar encabezado' : 'Editar encabezado'}
        </button>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-center text-xs text-slate-300">
        {editHeader ? (
          <textarea
            className={`${inputCls} min-h-[120px] text-center`}
            value={headerLines.join('\n')}
            onChange={(e) => setHeaderLines(e.target.value.split('\n'))}
          />
        ) : (
          <>
            {headerLines.map((line) => (
              <p key={line} className="uppercase tracking-wide">
                {line}
              </p>
            ))}
            {divisionName && (
              <p className="mt-2 font-semibold text-cyan-300/90">
                Coordinación de resguardo de instalaciones — {divisionName}
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          className={inputCls}
          value={form.departmentId}
          disabled={!isSuperAdmin && departments.length <= 1}
          onChange={(e) =>
            setForm({ ...form, departmentId: e.target.value, squadId: '', officerIds: [] })
          }
        >
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={form.squadId}
          onChange={(e) => setForm({ ...form, squadId: e.target.value })}
        >
          <option value="">Escuadra principal</option>
          {squads.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          required
          className={`md:col-span-2 ${inputCls}`}
          placeholder="LUGAR: Av. 62 con calle 149A, Conjunto Residencial…"
          value={form.lugar}
          onChange={(e) => setForm({ ...form, lugar: e.target.value })}
        />
        <select
          required
          className={inputCls}
          value={form.peaceQuadrantId}
          onChange={(e) => setForm({ ...form, peaceQuadrantId: e.target.value })}
        >
          <option value="">Cuadrante de Paz / PARROQUIA</option>
          {quadrants.map((q) => (
            <option key={q.id} value={q.id}>
              {q.code} — {q.name} ({q.parroquia})
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          required
          className={inputCls}
          value={form.eventAt}
          onChange={(e) => setForm({ ...form, eventAt: e.target.value })}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Concepto</label>
          <select
            className={inputCls}
            value={form.concepto}
            onChange={(e) => setForm({ ...form, concepto: e.target.value })}
          >
            <option value="">Seleccione concepto</option>
            {conceptos.map((c) => (
              <option key={c.label} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>
          <div className="mt-1 flex gap-1">
            <input
              className={`flex-1 ${inputCls}`}
              placeholder="Nuevo concepto"
              value={newConcepto}
              onChange={(e) => setNewConcepto(e.target.value)}
            />
            <button
              type="button"
              className={btnCls}
              onClick={() => void addCatalogEntry('CONCEPTO', newConcepto)}
            >
              +
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Asunto</label>
          <select
            required
            className={inputCls}
            value={form.asunto}
            onChange={(e) => setForm({ ...form, asunto: e.target.value })}
          >
            <option value="">Seleccione asunto</option>
            {asuntos.map((a) => (
              <option key={a.label} value={a.label}>
                {a.label}
              </option>
            ))}
          </select>
          <div className="mt-1 flex gap-1">
            <input
              className={`flex-1 ${inputCls}`}
              placeholder="Nuevo asunto"
              value={newAsunto}
              onChange={(e) => setNewAsunto(e.target.value)}
            />
            <button
              type="button"
              className={btnCls}
              onClick={() => void addCatalogEntry('ASUNTO', newAsunto)}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs text-slate-400">Reseña</label>
          <button
            type="button"
            className="text-[10px] text-cyan-500/80"
            onClick={() => setEditReseñaPrefix((v) => !v)}
          >
            {editReseñaPrefix ? 'Ocultar prefijo' : 'Editar prefijo institucional'}
          </button>
        </div>
        {editReseñaPrefix ? (
          <textarea
            className={`mb-2 ${inputCls} min-h-[80px]`}
            value={reseñaPrefix}
            onChange={(e) => setReseñaPrefix(e.target.value)}
          />
        ) : (
          <p className="mb-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
            {reseñaPrefix}
          </p>
        )}
        <textarea
          required
          minLength={10}
          className={`${inputCls} min-h-[100px]`}
          placeholder="Siendo las HH:MM horas… estando todo sin ningún tipo de novedad."
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Acciones tomadas</label>
        <textarea
          className={`${inputCls} min-h-[72px]`}
          value={form.accionesTomadas}
          onChange={(e) => setForm({ ...form, accionesTomadas: e.target.value })}
        />
      </div>

      <div>
        <p className="mb-2 text-xs text-slate-400">Funcionarios actuantes (de su comando)</p>
        <div className="grid max-h-40 gap-2 overflow-y-auto sm:grid-cols-2">
          {departmentOfficers.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={form.officerIds.includes(o.id)}
                onChange={() =>
                  setForm((f) => ({
                    ...f,
                    officerIds: f.officerIds.includes(o.id)
                      ? f.officerIds.filter((id) => id !== o.id)
                      : [...f.officerIds, o.id],
                  }))
                }
              />
              O/J: {o.nombres} {o.apellidos} (#{o.cedula})
            </label>
          ))}
        </div>
      </div>

      <input
        className={inputCls}
        placeholder="Unidad(es): Particular."
        value={form.unidades}
        onChange={(e) => setForm({ ...form, unidades: e.target.value })}
      />

      <MinuteVehiclesEditor vehicles={minuteVehicles} onChange={setMinuteVehicles} />

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs text-slate-400">
            Fijación fotográfica (máx. {MAX_PHOTOS})
          </label>
          <span className="text-[10px] text-slate-500">{photos.length}/{MAX_PHOTOS}</span>
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          className="block w-full text-xs text-slate-400"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS);
            setPhotos(files);
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <button type="button" className={btnCls} onClick={captureGps}>
          Usar mi ubicación (origen)
        </button>
        {gpsStatus && <p className="text-xs text-slate-400">{gpsStatus}</p>}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-center text-xs text-slate-400">
        <button
          type="button"
          className="mb-2 text-[10px] text-cyan-500/80"
          onClick={() => setEditLema((v) => !v)}
        >
          {editLema ? 'Ocultar lema' : 'Editar lema institucional'}
        </button>
        {editLema ? (
          <textarea
            className={`${inputCls} min-h-[72px] text-center`}
            value={lema}
            onChange={(e) => setLema(e.target.value)}
          />
        ) : (
          lema.split('\n').map((line) => <p key={line}>{line}</p>)
        )}
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={submitting} className={btnCls}>
        {submitting ? 'Registrando…' : 'Registrar minuta de salida'}
      </button>
    </form>
  );
}
