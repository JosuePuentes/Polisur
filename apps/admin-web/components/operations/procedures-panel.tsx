'use client';

import { useEffect, useMemo, useState } from 'react';
import { proceduresApi, type ProcedureRecord } from '@/lib/api/procedures';
import { searchOfficers } from '@/lib/api/rrhh';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';
import {
  MinuteVehiclesEditor,
  RegistrySearch,
} from '@/components/operations/registry-search';

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';
const btnCls = 'rounded-lg bg-cyan-700 px-3 py-2 text-sm text-white disabled:opacity-50';

const PHOTO_FIELDS = [
  { key: 'photo_front', label: 'Frente' },
  { key: 'photo_left', label: 'Perfil izquierdo' },
  { key: 'photo_right', label: 'Perfil derecho' },
  { key: 'photo_back', label: 'Espalda' },
  { key: 'photo_doc_1', label: 'Fijación 5' },
  { key: 'photo_doc_2', label: 'Fijación 6' },
] as const;

const STATUS_LABEL: Record<string, string> = {
  EN_CURSO: 'En curso — pendiente llegada',
  PENDIENTE_CIERRE: 'Pendiente de cierre',
  PENDIENTE_FIJACION: 'Pendiente fijación en comando',
  SIN_NOVEDAD: 'Cerrado sin novedad',
  EXITOSO: 'Procedimiento exitoso',
};

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
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-500/80">SITOP</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-100">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </header>
      {children}
    </div>
  );
}

export function ProceduresPanel() {
  const session = getSession();
  const canManage = hasPermission(session?.permissions, SITOP_PERMISSIONS.PROCEDURES_MANAGE);

  const [scope, setScope] = useState<'active' | 'completed'>('active');
  const [procedures, setProcedures] = useState<ProcedureRecord[]>([]);
  const [selected, setSelected] = useState<ProcedureRecord | null>(null);
  const [officers, setOfficers] = useState<
    Array<{ id: string; nombres: string; apellidos: string; cedula: string }>
  >([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [arrivalForm, setArrivalForm] = useState({
    descripcion: '',
    bringsDetainee: false,
    bringsObjects: false,
    bringsVehicles: false,
    bringsPersons: false,
    officerIds: [] as string[],
  });
  const [arrivalVehicles, setArrivalVehicles] = useState<
    Array<{ plate: string; vehicleType: string; ownerCedula: string; notes: string }>
  >([]);

  const [closeOutcome, setCloseOutcome] = useState<'SIN_NOVEDAD' | 'TRASLADO_CIUDADANO' | 'TRASLADO_OBJETO'>(
    'SIN_NOVEDAD',
  );
  const [closeForm, setCloseForm] = useState({
    fijaciones: '',
    nombres: '',
    apellidos: '',
    cedula: '',
    alias: '',
    delitoInicial: '',
    objectDescription: '',
  });
  const [closePhotos, setClosePhotos] = useState<Record<string, File>>({});
  const [fijacionCompleta, setFijacionCompleta] = useState(false);
  const [commandFijacionPhotos, setCommandFijacionPhotos] = useState<Record<string, File>>({});

  const activeCount = useMemo(
    () =>
      procedures.filter(
        (p) =>
          p.status === 'EN_CURSO' ||
          p.status === 'PENDIENTE_CIERRE' ||
          p.status === 'PENDIENTE_FIJACION',
      ).length,
    [procedures],
  );

  function reload() {
    void proceduresApi.list(scope).then(setProcedures).catch(() => setProcedures([]));
  }

  useEffect(() => {
    reload();
    void searchOfficers().then((list) =>
      setOfficers(list as typeof officers),
    );
  }, [scope]);

  function selectProcedure(proc: ProcedureRecord) {
    setSelected(proc);
    setMsg('');
    setError('');
    setArrivalForm({
      descripcion: '',
      bringsDetainee: false,
      bringsObjects: false,
      bringsVehicles: false,
      bringsPersons: false,
      officerIds:
        proc.departureMinute.officers?.map((row) => row.officer.id) ?? [],
    });
    setArrivalVehicles([]);
  }

  async function submitArrival(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    try {
      const updated = await proceduresApi.registerArrival(selected.id, {
        descripcion: arrivalForm.descripcion,
        bringsDetainee: arrivalForm.bringsDetainee,
        bringsObjects: arrivalForm.bringsObjects,
        bringsVehicles: arrivalForm.bringsVehicles,
        bringsPersons: arrivalForm.bringsPersons,
        officerIds: arrivalForm.officerIds.length
          ? arrivalForm.officerIds
          : officers.slice(0, 1).map((o) => o.id),
        vehicles: arrivalVehicles
          .filter((v) => v.plate.trim().length >= 3)
          .map((v) => ({
            plate: v.plate.trim(),
            vehicleType: v.vehicleType,
            ownerCedula: v.ownerCedula.trim() || undefined,
            notes: v.notes.trim() || undefined,
          })),
      });
      setSelected(updated);
      setMsg('Minuta de llegada registrada. Complete el cierre del procedimiento.');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la llegada');
    }
  }

  async function submitClose(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    const fd = new FormData();
    fd.set('outcome', closeOutcome);
    if (closeForm.fijaciones) fd.set('fijaciones', closeForm.fijaciones);
    if (closeForm.nombres) fd.set('nombres', closeForm.nombres);
    if (closeForm.apellidos) fd.set('apellidos', closeForm.apellidos);
    if (closeForm.cedula) fd.set('cedula', closeForm.cedula);
    if (closeForm.alias) fd.set('alias', closeForm.alias);
    if (closeForm.delitoInicial) fd.set('delitoInicial', closeForm.delitoInicial);
    if (closeForm.objectDescription) fd.set('objectDescription', closeForm.objectDescription);
    fd.set('fijacionCompleta', fijacionCompleta ? 'true' : 'false');
    for (const field of PHOTO_FIELDS) {
      const file = closePhotos[field.key];
      if (file) fd.set(field.key, file);
    }

    try {
      await proceduresApi.closeForm(selected.id, fd);
      setMsg('Procedimiento cerrado correctamente');
      setSelected(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar el procedimiento');
    }
  }

  async function submitCommandFijacion(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    const fd = new FormData();
    for (const field of PHOTO_FIELDS) {
      const file = commandFijacionPhotos[field.key];
      if (file) fd.set(field.key, file);
    }
    try {
      await proceduresApi.completeFijacion(selected.id, fd);
      setMsg('Fijación en comando completada — ciudadano listo para calabozos');
      setSelected(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la fijación');
    }
  }

  return (
    <Shell
      title="Procedimientos en curso"
      subtitle="La escuadra queda en procedimiento desde la minuta de salida hasta el cierre con llegada, fijaciones y traslado si aplica."
    >
      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
          {msg}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setScope('active')}
          className={`rounded-lg px-4 py-2 text-sm ${scope === 'active' ? 'bg-cyan-900/40 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}
        >
          En curso ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setScope('completed')}
          className={`rounded-lg px-4 py-2 text-sm ${scope === 'completed' ? 'bg-cyan-900/40 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}
        >
          Finalizados
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="space-y-2">
          {procedures.map((proc) => (
            <button
              key={proc.id}
              type="button"
              onClick={() => selectProcedure(proc)}
              className={`w-full rounded-xl border px-4 py-3 text-left ${
                selected?.id === proc.id
                  ? 'border-cyan-500/40 bg-cyan-950/20'
                  : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-cyan-300">{proc.code}</span>
                <span className="text-xs uppercase text-amber-300/90">
                  {STATUS_LABEL[proc.status] ?? proc.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-200">
                {proc.department.name}
                {proc.squad ? ` · ${proc.squad.name}` : ''}
              </p>
              <p className="text-xs text-slate-500 line-clamp-2">
                Salida: {proc.departureMinute.descripcion}
              </p>
            </button>
          ))}
          {procedures.length === 0 && (
            <p className="text-sm text-slate-500">No hay procedimientos en esta bandeja.</p>
          )}
        </section>

        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          {!selected ? (
            <p className="text-sm text-slate-500">
              Seleccione un procedimiento para registrar llegada o cerrar la actuación.
            </p>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">{selected.code}</h2>
                <p className="text-xs text-slate-400">{STATUS_LABEL[selected.status]}</p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
                <p className="font-semibold text-slate-300">Minuta de salida</p>
                <p className="mt-1 whitespace-pre-wrap">{selected.departureMinute.descripcion}</p>
                {selected.arrivalMinute && (
                  <>
                    <p className="mt-3 font-semibold text-slate-300">Minuta de llegada</p>
                    <p className="mt-1 whitespace-pre-wrap">{selected.arrivalMinute.descripcion}</p>
                  </>
                )}
              </div>

              {canManage && selected.status === 'EN_CURSO' && (
                <form onSubmit={(e) => void submitArrival(e)} className="space-y-3 border-t border-slate-800 pt-4">
                  <h3 className="text-xs font-semibold uppercase text-slate-400">Minuta de llegada</h3>
                  <textarea
                    required
                    minLength={10}
                    className={inputCls}
                    placeholder="Relato de llegada"
                    value={arrivalForm.descripcion}
                    onChange={(e) => setArrivalForm({ ...arrivalForm, descripcion: e.target.value })}
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={arrivalForm.bringsDetainee}
                      onChange={(e) =>
                        setArrivalForm({ ...arrivalForm, bringsDetainee: e.target.checked })
                      }
                    />
                    Trae ciudadano detenido
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={arrivalForm.bringsObjects}
                      onChange={(e) =>
                        setArrivalForm({ ...arrivalForm, bringsObjects: e.target.checked })
                      }
                    />
                    Trae objetos recuperados
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={arrivalForm.bringsVehicles}
                      onChange={(e) =>
                        setArrivalForm({ ...arrivalForm, bringsVehicles: e.target.checked })
                      }
                    />
                    Trae vehículos
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={arrivalForm.bringsPersons}
                      onChange={(e) =>
                        setArrivalForm({ ...arrivalForm, bringsPersons: e.target.checked })
                      }
                    />
                    Trae personas (sin detención)
                  </label>
                  <MinuteVehiclesEditor vehicles={arrivalVehicles} onChange={setArrivalVehicles} />
                  <button type="submit" className={`${btnCls} w-full`}>
                    Registrar llegada
                  </button>
                </form>
              )}

              {canManage && selected.status === 'PENDIENTE_CIERRE' && (
                <form onSubmit={(e) => void submitClose(e)} className="space-y-3 border-t border-slate-800 pt-4">
                  <h3 className="text-xs font-semibold uppercase text-slate-400">Cierre del procedimiento</h3>
                  <select
                    className={inputCls}
                    value={closeOutcome}
                    onChange={(e) =>
                      setCloseOutcome(
                        e.target.value as 'SIN_NOVEDAD' | 'TRASLADO_CIUDADANO' | 'TRASLADO_OBJETO',
                      )
                    }
                  >
                    <option value="SIN_NOVEDAD">Sin novedad</option>
                    <option value="TRASLADO_CIUDADANO">Traslado de ciudadano a calabozos</option>
                    <option value="TRASLADO_OBJETO">Traslado de objeto recuperado</option>
                  </select>

                  {closeOutcome === 'TRASLADO_OBJETO' && (
                    <input
                      required
                      className={inputCls}
                      placeholder="Descripción del objeto"
                      value={closeForm.objectDescription}
                      onChange={(e) =>
                        setCloseForm({ ...closeForm, objectDescription: e.target.value })
                      }
                    />
                  )}

                  {closeOutcome === 'TRASLADO_CIUDADANO' && (
                    <>
                      <input
                        required
                        className={inputCls}
                        placeholder="Nombres del ciudadano"
                        value={closeForm.nombres}
                        onChange={(e) => setCloseForm({ ...closeForm, nombres: e.target.value })}
                      />
                      <input
                        required
                        className={inputCls}
                        placeholder="Apellidos"
                        value={closeForm.apellidos}
                        onChange={(e) => setCloseForm({ ...closeForm, apellidos: e.target.value })}
                      />
                      <input
                        className={inputCls}
                        placeholder="Cédula (opcional)"
                        value={closeForm.cedula}
                        onChange={(e) => setCloseForm({ ...closeForm, cedula: e.target.value })}
                      />
                      {closeForm.cedula.trim().length >= 3 && (
                        <RegistrySearch compact initialQuery={closeForm.cedula.trim()} />
                      )}
                      <input
                        className={inputCls}
                        placeholder="Alias (opcional)"
                        value={closeForm.alias}
                        onChange={(e) => setCloseForm({ ...closeForm, alias: e.target.value })}
                      />
                      <input
                        className={inputCls}
                        placeholder="Delito inicial"
                        value={closeForm.delitoInicial}
                        onChange={(e) =>
                          setCloseForm({ ...closeForm, delitoInicial: e.target.value })
                        }
                      />
                      <textarea
                        required
                        className={inputCls}
                        placeholder="Fijaciones — lo encontrado al ciudadano"
                        value={closeForm.fijaciones}
                        onChange={(e) =>
                          setCloseForm({ ...closeForm, fijaciones: e.target.value })
                        }
                      />
                      <p className="text-xs text-slate-500">Adjunte al menos 6 fotografías de fijación:</p>
                      <label className="flex items-center gap-2 text-xs text-amber-300/90">
                        <input
                          type="checkbox"
                          checked={fijacionCompleta}
                          onChange={(e) => setFijacionCompleta(e.target.checked)}
                        />
                        Fijación completa en campo (6 fotos listas)
                      </label>
                      {!fijacionCompleta && (
                        <p className="text-[10px] text-amber-400/70">
                          Si la fijación queda pendiente, el procedimiento pasará a espera de fijación en comando.
                        </p>
                      )}
                      {PHOTO_FIELDS.map((field) => (
                        <label key={field.key} className="block text-xs text-slate-400">
                          {field.label}
                          <input
                            type="file"
                            accept="image/*"
                            className="mt-1 block w-full text-[10px]"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setClosePhotos((prev) => ({ ...prev, [field.key]: file }));
                            }}
                          />
                        </label>
                      ))}
                    </>
                  )}

                  <button type="submit" className={`${btnCls} w-full`}>
                    Cerrar procedimiento
                  </button>
                </form>
              )}

              {canManage && selected.status === 'PENDIENTE_FIJACION' && (
                <form
                  onSubmit={(e) => void submitCommandFijacion(e)}
                  className="space-y-3 border-t border-slate-800 pt-4"
                >
                  <h3 className="text-xs font-semibold uppercase text-amber-400">
                    Fijación pendiente en comando
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cargue las 6 fotografías de fijación con objetos incautados tomadas en el comando.
                    Luego el ciudadano podrá ingresar a calabozos.
                  </p>
                  {PHOTO_FIELDS.map((field) => (
                    <label key={field.key} className="block text-xs text-slate-400">
                      {field.label}
                      <input
                        type="file"
                        accept="image/*"
                        required
                        className="mt-1 block w-full text-[10px]"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCommandFijacionPhotos((prev) => ({ ...prev, [field.key]: file }));
                          }
                        }}
                      />
                    </label>
                  ))}
                  <button type="submit" className={`${btnCls} w-full`}>
                    Completar fijación en comando
                  </button>
                </form>
              )}
            </>
          )}
        </aside>
      </div>
    </Shell>
  );
}
