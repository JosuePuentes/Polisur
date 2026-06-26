'use client';

import { useEffect, useMemo, useState } from 'react';
import { opsApi } from '@/lib/api/operations';
import { fetchIncidents } from '@/lib/api/incidents';
import { fetchRrhhCatalogs, searchOfficers, setSquadLeader } from '@/lib/api/rrhh';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';
import { PARROQUIAS_SAN_FRANCISCO, SECTORES_REFERENCIA } from '@/lib/constants/public-portal';
import type { Incident } from '@/lib/types/incident.types';

const inputCls = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';
const btnCls = 'rounded-lg bg-cyan-700 px-3 py-2 text-sm text-white disabled:opacity-50';

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
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

export function PatrolPanel() {
  const [patrols, setPatrols] = useState<unknown[]>([]);
  const [officers, setOfficers] = useState<Array<{ id: string; nombres: string; apellidos: string; cedula: string }>>([]);
  const [catalogs, setCatalogs] = useState<Awaited<ReturnType<typeof fetchRrhhCatalogs>> | null>(null);
  const [form, setForm] = useState({
    patrolType: 'MINUTA',
    parroquia: PARROQUIAS_SAN_FRANCISCO[0] as string,
    cuadrante: SECTORES_REFERENCIA[0] as string,
    descripcion: '',
    departmentId: '',
    squadId: '',
    officerIds: [] as string[],
    leaderOfficerId: '',
  });
  const [objDesc, setObjDesc] = useState('');
  const [selectedPatrol, setSelectedPatrol] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    void Promise.all([opsApi.listPatrols(), fetchRrhhCatalogs(), searchOfficers()]).then(([p, c, o]) => {
      setPatrols(p);
      setCatalogs(c);
      setOfficers(o as typeof officers);
      if (c.departments[0]) setForm((f) => ({ ...f, departmentId: c.departments[0].id }));
    });
  }, []);

  const squads = catalogs?.departments.find((d) => d.id === form.departmentId)?.squads ?? [];

  return (
    <Shell title="Patrullaje y Minutas" subtitle="Minutas, patrullajes inteligentes, procedimientos mixtos y objetos recuperados.">
      <form
        className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void opsApi.createPatrol({ ...form, officerIds: form.officerIds.length ? form.officerIds : officers.slice(0, 1).map((o) => o.id) })
            .then(() => { setMsg('Minuta registrada'); return opsApi.listPatrols(); })
            .then(setPatrols);
        }}
      >
        <h2 className="text-sm font-semibold text-slate-200">Nueva minuta / patrullaje</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <select className={inputCls} value={form.patrolType} onChange={(e) => setForm({ ...form, patrolType: e.target.value })}>
            <option value="MINUTA">Minuta</option>
            <option value="PATRULLAJE">Patrullaje</option>
            <option value="PROCEDIMIENTO_MIXTO">Procedimiento mixto</option>
          </select>
          <select className={inputCls} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value, squadId: '' })}>
            {catalogs?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className={inputCls} value={form.squadId} onChange={(e) => setForm({ ...form, squadId: e.target.value })}>
            <option value="">Escuadra principal</option>
            {squads.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className={inputCls} value={form.parroquia} onChange={(e) => setForm({ ...form, parroquia: e.target.value })}>
            {PARROQUIAS_SAN_FRANCISCO.map((p) => <option key={p}>{p}</option>)}
          </select>
          <textarea required minLength={10} className={`md:col-span-2 ${inputCls}`} placeholder="Relato operativo" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <div>
          <p className="mb-2 text-xs text-slate-400">Funcionarios en la comisión (puede incluir otras escuadras/divisiones):</p>
          <div className="grid gap-2 sm:grid-cols-2 max-h-40 overflow-y-auto">
            {officers.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={form.officerIds.includes(o.id)}
                  onChange={() => setForm((f) => ({
                    ...f,
                    officerIds: f.officerIds.includes(o.id)
                      ? f.officerIds.filter((id) => id !== o.id)
                      : [...f.officerIds, o.id],
                  }))}
                />
                {o.nombres} {o.apellidos} ({o.cedula})
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className={btnCls}>Registrar</button>
        {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Objeto recuperado</h2>
        <select className={inputCls} value={selectedPatrol} onChange={(e) => setSelectedPatrol(e.target.value)}>
          <option value="">Seleccione minuta</option>
          {(patrols as Array<{ id: string; code: string }>).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>
        <input className={inputCls} placeholder="Descripción del objeto" value={objDesc} onChange={(e) => setObjDesc(e.target.value)} />
        <button type="button" className={btnCls} disabled={!selectedPatrol || !objDesc} onClick={() => void opsApi.addRecoveredObject(selectedPatrol, { description: objDesc }).then(() => setMsg('Objeto registrado'))}>Agregar objeto</button>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-200">Registro reciente</h2>
        {(patrols as Array<{ id: string; code: string; patrolType: string; descripcion: string; recoveredObjects?: unknown[] }>).map((p) => (
          <div key={p.id} className="rounded-lg border border-slate-800 px-4 py-3 text-sm">
            <p className="font-mono text-cyan-300">{p.code}</p>
            <p className="text-slate-400">{p.patrolType} · {p.descripcion.slice(0, 80)}</p>
            <p className="text-xs text-slate-500">Objetos: {(p.recoveredObjects as unknown[])?.length ?? 0}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function DetaineesPanel() {
  const [list, setList] = useState<unknown[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ nombres: '', apellidos: '', cedula: '', cellNumber: '', delitoInicial: '', incidentId: '' });
  const [hearing, setHearing] = useState({ fecha: '', tribunal: '', resultado: '' });

  function reload() {
    void opsApi.listDetainees().then(setList);
  }

  useEffect(() => {
    reload();
    void fetchIncidents().then(setIncidents).catch(() => setIncidents([]));
  }, []);

  return (
    <Shell title="Detenidos y Calabozos" subtitle="Registro de presos, historial de delitos, audiencias y vínculo con incidentes.">
      <form className="grid gap-3 md:grid-cols-2 rounded-xl border border-slate-800 bg-slate-900/40 p-5" onSubmit={(e) => {
        e.preventDefault();
        void opsApi.createDetainee({
          ...form,
          incidentId: form.incidentId || undefined,
        }).then(() => {
          setForm({ nombres: '', apellidos: '', cedula: '', cellNumber: '', delitoInicial: '', incidentId: '' });
          reload();
        });
      }}>
        <input required className={inputCls} placeholder="Nombres" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} />
        <input required className={inputCls} placeholder="Apellidos" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
        <input className={inputCls} placeholder="Cédula" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} />
        <input className={inputCls} placeholder="Celda" value={form.cellNumber} onChange={(e) => setForm({ ...form, cellNumber: e.target.value })} />
        <input className={inputCls} placeholder="Delito inicial" value={form.delitoInicial} onChange={(e) => setForm({ ...form, delitoInicial: e.target.value })} />
        <select className={inputCls} value={form.incidentId} onChange={(e) => setForm({ ...form, incidentId: e.target.value })}>
          <option value="">Sin incidente vinculado</option>
          {incidents.map((inc) => (
            <option key={inc.id} value={inc.id}>{inc.code} — {inc.tipoDelito}</option>
          ))}
        </select>
        <button type="submit" className={`md:col-span-2 ${btnCls}`}>Ingresar detenido</button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {(list as Array<{ id: string; nombres: string; apellidos: string; status: string; _count: { hearings: number; records: number } }>).map((d) => (
            <button key={d.id} type="button" className="w-full rounded-lg border border-slate-800 px-4 py-3 text-left text-sm" onClick={() => void opsApi.getDetainee(d.id).then((r) => setSelected(r as Record<string, unknown>))}>
              <p className="text-slate-100">{d.nombres} {d.apellidos}</p>
              <p className="text-xs text-slate-500">{d.status} · {d._count.hearings} audiencias · {d._count.records} antecedentes</p>
            </button>
          ))}
        </div>
        {selected && (
          <div className="rounded-xl border border-slate-800 p-4 space-y-3 text-sm">
            <h3 className="font-semibold text-slate-200">Expediente</h3>
            <p className="text-slate-400">Audiencias: {((selected.hearings as unknown[]) ?? []).length}</p>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-slate-500">Antecedentes / incidentes</p>
              {((selected.records as Array<{ delito: string; incident?: { code: string; tipoDelito: string } | null }>) ?? []).map((rec, i) => (
                <p key={i} className="text-xs text-slate-400">
                  {rec.delito}
                  {rec.incident ? ` · Expediente ${rec.incident.code} (${rec.incident.tipoDelito})` : ''}
                </p>
              ))}
            </div>
            <form className="space-y-2" onSubmit={(e) => {
              e.preventDefault();
              void opsApi.addHearing(selected.id as string, hearing).then(() => opsApi.getDetainee(selected.id as string).then((r) => setSelected(r as Record<string, unknown>)));
            }}>
              <input type="date" required className={inputCls} value={hearing.fecha} onChange={(e) => setHearing({ ...hearing, fecha: e.target.value })} />
              <input required className={inputCls} placeholder="Tribunal" value={hearing.tribunal} onChange={(e) => setHearing({ ...hearing, tribunal: e.target.value })} />
              <input className={inputCls} placeholder="Resultado" value={hearing.resultado} onChange={(e) => setHearing({ ...hearing, resultado: e.target.value })} />
              <button type="submit" className={btnCls}>Registrar audiencia</button>
            </form>
          </div>
        )}
      </div>
    </Shell>
  );
}

function weekDates(base = new Date()): string[] {
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function handleGpsCheckIn(shiftId: string, reload: () => void) {
  const doCheckIn = (coords?: { latitude: number; longitude: number }) => {
    void opsApi.checkInShift(shiftId, coords).then(reload);
  };

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => doCheckIn({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => doCheckIn(),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  } else {
    doCheckIn();
  }
}

export function ShiftsPanel() {
  const session = getSession();
  const canManage = hasPermission(session?.permissions, SITOP_PERMISSIONS.SHIFTS_MANAGE);
  const [roster, setRoster] = useState<Array<{ officer: { id: string; nombres: string; apellidos: string; grado: string | null }; shift: { id: string; horaInicio: string; horaFin: string; checkInLatitude?: number | null; checkInLongitude?: number | null } | null; dotStatus: string }>>([]);
  const [weekShifts, setWeekShifts] = useState<unknown[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10));
  const [filterDept, setFilterDept] = useState('');
  const [form, setForm] = useState({ officerId: '', departmentId: '', fecha: new Date().toISOString().slice(0, 10), horaInicio: '08:00', horaFin: '16:00' });
  const [officers, setOfficers] = useState<Array<{ id: string; nombres: string; apellidos: string; departmentId: string }>>([]);
  const [catalogs, setCatalogs] = useState<Awaited<ReturnType<typeof fetchRrhhCatalogs>> | null>(null);

  const days = useMemo(() => weekDates(), []);

  function reload() {
    void opsApi.activeRoster(filterDept || undefined).then((r) => setRoster(r as typeof roster));
    void opsApi.listShifts(selectedDay, filterDept || undefined).then(setWeekShifts);
  }

  useEffect(() => {
    void Promise.all([searchOfficers(), fetchRrhhCatalogs()]).then(([o, c]) => {
      setOfficers(o as typeof officers);
      setCatalogs(c);
      if (c.departments[0]) {
        setForm((f) => ({ ...f, departmentId: c.departments[0].id }));
        setFilterDept(c.departments[0].id);
      }
    });
  }, []);

  useEffect(() => { reload(); }, [filterDept, selectedDay]);

  const dotColor = { gris: 'bg-slate-500', naranja: 'bg-orange-500', verde: 'bg-emerald-500' };
  const deptOfficers = filterDept ? officers.filter((o) => o.departmentId === filterDept) : officers;

  return (
    <Shell title="Guardias y Funcionarios Activos" subtitle="Calendario semanal, filtro por comando y check-in con GPS.">
      <div className="flex flex-wrap items-center gap-3">
        <select className={inputCls + ' max-w-xs'} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">Todos los comandos</option>
          {catalogs?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-1">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={`rounded-lg px-2 py-1 text-xs ${selectedDay === d ? 'bg-cyan-900/40 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}
            >
              {d.slice(5)}
            </button>
          ))}
        </div>
      </div>

      {canManage && (
        <form className="grid gap-3 md:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5" onSubmit={(e) => {
          e.preventDefault();
          void opsApi.createShift({ ...form, fecha: selectedDay }).then(reload);
        }}>
          <select required className={inputCls} value={form.officerId} onChange={(e) => setForm({ ...form, officerId: e.target.value })}>
            <option value="">Funcionario</option>
            {deptOfficers.map((o) => <option key={o.id} value={o.id}>{o.nombres} {o.apellidos}</option>)}
          </select>
          <select className={inputCls} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
            {catalogs?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input className={inputCls} value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} />
          <input className={inputCls} value={form.horaFin} onChange={(e) => setForm({ ...form, horaFin: e.target.value })} />
          <button type="submit" className={btnCls}>Programar guardia ({selectedDay})</button>
        </form>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-200">Guardias del día {selectedDay}</h2>
        <div className="space-y-2">
          {(weekShifts as Array<{ id: string; horaInicio: string; horaFin: string; status: string; officer: { nombres: string; apellidos: string } }>).map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300">
              {s.officer.nombres} {s.officer.apellidos} · {s.horaInicio}-{s.horaFin} · {s.status}
            </div>
          ))}
          {weekShifts.length === 0 && <p className="text-xs text-slate-500">Sin guardias programadas</p>}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {roster.map(({ officer, shift, dotStatus }) => (
          <div key={officer.id} className="flex items-center gap-3 rounded-lg border border-slate-800 px-4 py-3">
            <span className={`h-3 w-3 rounded-full ${dotColor[dotStatus as keyof typeof dotColor] ?? dotColor.gris}`} />
            <div className="flex-1 text-sm">
              <p className="text-slate-100">{officer.nombres} {officer.apellidos}</p>
              <p className="text-xs text-slate-500">
                {officer.grado ?? 'Oficial'}
                {shift ? ` · ${shift.horaInicio}-${shift.horaFin}` : ' · Sin guardia hoy'}
                {shift?.checkInLatitude != null && shift.checkInLongitude != null
                  ? ` · GPS ${shift.checkInLatitude.toFixed(4)}, ${shift.checkInLongitude.toFixed(4)}`
                  : ''}
              </p>
            </div>
            {canManage && shift && dotStatus === 'naranja' && (
              <button type="button" className="text-xs text-cyan-400" onClick={() => handleGpsCheckIn(shift.id, reload)}>Marcar llegada</button>
            )}
          </div>
        ))}
      </div>
    </Shell>
  );
}

type CommandRow = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  commander: { id: string; nombres: string; apellidos: string } | null;
  squads: Array<{
    id: string;
    name: string;
    callsign: string | null;
    leader: { id: string; nombres: string; apellidos: string } | null;
  }>;
  controlPoints: Array<{ id: string; name: string; address: string | null }>;
  _count: { officers: number };
};

export function CommandsPanel() {
  const session = getSession();
  const canManage = hasPermission(session?.permissions, SITOP_PERMISSIONS.COMMANDS_MANAGE);
  const [commands, setCommands] = useState<CommandRow[]>([]);
  const [officers, setOfficers] = useState<Array<{ id: string; nombres: string; apellidos: string; departmentId: string }>>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', address: '', commanderId: '' });
  const [cpForm, setCpForm] = useState({ name: '', address: '' });
  const [msg, setMsg] = useState('');

  function reload() {
    void opsApi.listCommands().then((data) => setCommands(data as CommandRow[]));
  }

  useEffect(() => {
    reload();
    void searchOfficers().then((o) => setOfficers(o as typeof officers));
  }, []);

  function openCommand(cmd: CommandRow) {
    setExpandedId(cmd.id === expandedId ? null : cmd.id);
    setEditForm({
      name: cmd.name,
      address: cmd.address ?? '',
      commanderId: cmd.commander?.id ?? '',
    });
    setCpForm({ name: '', address: '' });
  }

  return (
    <Shell title="Comandos y Divisiones" subtitle="Jefe de comando, jefes de escuadra, dirección y puntos de control.">
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      <div className="space-y-3">
        {commands.map((c) => {
          const deptOfficers = officers.filter((o) => o.departmentId === c.id);
          const isOpen = expandedId === c.id;
          return (
            <div key={c.id} className="rounded-xl border border-slate-800 px-5 py-4">
              <button type="button" className="w-full text-left" onClick={() => openCommand(c)}>
                <p className="font-semibold text-slate-100">{c.name} <span className="font-mono text-xs text-cyan-400">({c.code})</span></p>
                <p className="text-sm text-slate-400">
                  {c.address ?? 'Sin dirección'} · Jefe: {c.commander ? `${c.commander.nombres} ${c.commander.apellidos}` : 'Sin asignar'}
                  · {c._count.officers} funcionarios · {c.squads.length} escuadras · {c.controlPoints.length} puntos
                </p>
              </button>

              {isOpen && canManage && (
                <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                  <form className="grid gap-2 md:grid-cols-3" onSubmit={(e) => {
                    e.preventDefault();
                    void opsApi.updateCommand(c.id, {
                      name: editForm.name,
                      address: editForm.address || null,
                      commanderId: editForm.commanderId || null,
                    }).then(() => { setMsg('Comando actualizado'); reload(); });
                  }}>
                    <input className={inputCls} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    <input className={inputCls} placeholder="Dirección" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                    <select className={inputCls} value={editForm.commanderId} onChange={(e) => setEditForm({ ...editForm, commanderId: e.target.value })}>
                      <option value="">Sin jefe de comando</option>
                      {deptOfficers.map((o) => <option key={o.id} value={o.id}>{o.nombres} {o.apellidos}</option>)}
                    </select>
                    <button type="submit" className={btnCls}>Guardar comando</button>
                  </form>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Escuadras y jefes</p>
                    {c.squads.map((sq) => (
                      <div key={sq.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm">
                        <span className="text-slate-200">{sq.name}</span>
                        <select
                          className={inputCls + ' max-w-xs'}
                          value={sq.leader?.id ?? ''}
                          onChange={(e) => void setSquadLeader(sq.id, e.target.value || null).then(() => { setMsg('Jefe de escuadra asignado'); reload(); })}
                        >
                          <option value="">Sin jefe</option>
                          {deptOfficers.map((o) => <option key={o.id} value={o.id}>{o.nombres} {o.apellidos}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Puntos de control</p>
                    {c.controlPoints.map((cp) => (
                      <p key={cp.id} className="text-xs text-slate-400">{cp.name} — {cp.address ?? 'Sin dirección'}</p>
                    ))}
                    <form className="grid gap-2 md:grid-cols-3" onSubmit={(e) => {
                      e.preventDefault();
                      void opsApi.createControlPoint({ departmentId: c.id, name: cpForm.name, address: cpForm.address || undefined })
                        .then(() => { setCpForm({ name: '', address: '' }); setMsg('Punto de control creado'); reload(); });
                    }}>
                      <input required className={inputCls} placeholder="Nombre punto" value={cpForm.name} onChange={(e) => setCpForm({ ...cpForm, name: e.target.value })} />
                      <input className={inputCls} placeholder="Dirección" value={cpForm.address} onChange={(e) => setCpForm({ ...cpForm, address: e.target.value })} />
                      <button type="submit" className={btnCls}>Agregar punto</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

export function QuadrantsPanel() {
  const [list, setList] = useState<unknown[]>([]);
  const [form, setForm] = useState({ code: '', name: '', parroquia: PARROQUIAS_SAN_FRANCISCO[0] as string });
  useEffect(() => { void opsApi.listQuadrants().then(setList); }, []);
  return (
    <Shell title="Cuadrantes de Paz" subtitle="Registro geográfico de cuadrantes del municipio.">
      <form className="grid gap-3 md:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5" onSubmit={(e) => {
        e.preventDefault();
        void opsApi.createQuadrant(form).then(() => opsApi.listQuadrants().then(setList));
      }}>
        <input required className={inputCls} placeholder="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input required className={inputCls} placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <button type="submit" className={btnCls}>Registrar cuadrante</button>
      </form>
      <div className="space-y-2">
        {(list as Array<{ code: string; name: string; parroquia: string }>).map((q) => (
          <div key={q.code} className="rounded-lg border border-slate-800 px-4 py-3 text-sm text-slate-300">{q.code} — {q.name} ({q.parroquia})</div>
        ))}
      </div>
    </Shell>
  );
}

export function LogisticsPanel() {
  const session = getSession();
  const canManage = hasPermission(session?.permissions, SITOP_PERMISSIONS.LOGISTICS_MANAGE);
  const [items, setItems] = useState<unknown[]>([]);
  const [summary, setSummary] = useState<unknown[]>([]);
  const [shiftView, setShiftView] = useState<{
    fecha: string;
    turnos: Array<{ turno: string; officers: Array<{ nombres: string; apellidos: string }>; assets: Array<{ code: string; name: string; assetType: string }> }>;
    unassigned: Array<{ code: string; name: string }>;
  } | null>(null);
  const [catalogs, setCatalogs] = useState<Awaited<ReturnType<typeof fetchRrhhCatalogs>> | null>(null);
  const [filterDept, setFilterDept] = useState('');
  const [filterTurno, setFilterTurno] = useState('');
  const [officers, setOfficers] = useState<Array<{ id: string; nombres: string; apellidos: string; departmentId: string }>>([]);
  const [form, setForm] = useState({ code: '', name: '', assetType: 'PATRULLA', departmentId: '' });
  const [assign, setAssign] = useState({ assetId: '', officerId: '', turno: '08:00-16:00' });
  const [msg, setMsg] = useState('');

  function reload() {
    void Promise.all([
      opsApi.listInventory(filterDept || undefined, filterTurno || undefined),
      opsApi.inventorySummary(filterDept || undefined),
    ]).then(([i, s]) => { setItems(i); setSummary(s); });
    if (filterDept) {
      void opsApi.inventoryByShift(filterDept).then((v) => setShiftView(v as typeof shiftView));
    } else {
      setShiftView(null);
    }
  }

  useEffect(() => {
    void Promise.all([fetchRrhhCatalogs(), searchOfficers()]).then(([c, o]) => {
      setCatalogs(c);
      setOfficers(o as typeof officers);
      if (c.departments[0]) {
        setFilterDept(c.departments[0].id);
        setForm((f) => ({ ...f, departmentId: c.departments[0].id }));
      }
    });
  }, []);

  useEffect(() => { reload(); }, [filterDept, filterTurno]);

  type AssetRow = {
    id: string;
    code: string;
    name: string;
    assetType: string;
    status: string;
    turno: string | null;
    assignedOfficer: { nombres: string; apellidos: string } | null;
    department: { name: string } | null;
  };

  const deptOfficers = filterDept ? officers.filter((o) => o.departmentId === filterDept) : officers;

  return (
    <Shell title="Logística e Inventario" subtitle="Patrullas, motos y equipos — filtro por comando y asignación por turno de guardia.">
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        <select className={inputCls + ' max-w-xs'} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">Todos los comandos</option>
          {catalogs?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className={inputCls + ' max-w-xs'} value={filterTurno} onChange={(e) => setFilterTurno(e.target.value)}>
          <option value="">Todos los turnos</option>
          <option value="08:00-16:00">08:00-16:00</option>
          <option value="16:00-00:00">16:00-00:00</option>
          <option value="00:00-08:00">00:00-08:00</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {(summary as Array<{ assetType: string; status: string; _count: { id: number } }>).map((s, i) => (
          <span key={i} className="rounded-full border border-slate-700 px-3 py-1 text-slate-400">{s.assetType}: {s._count.id} ({s.status})</span>
        ))}
      </div>

      {shiftView && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Inventario por turno — {shiftView.fecha}</h2>
          {shiftView.turnos.map((t) => (
            <div key={t.turno} className="rounded-lg border border-slate-800 px-3 py-2">
              <p className="text-xs font-semibold text-cyan-400">Turno {t.turno}</p>
              <p className="text-xs text-slate-500">Oficiales: {t.officers.map((o) => `${o.nombres} ${o.apellidos}`).join(', ') || 'Ninguno'}</p>
              <p className="text-xs text-slate-500">Activos: {t.assets.map((a) => a.code).join(', ') || 'Sin asignar'}</p>
            </div>
          ))}
          {shiftView.unassigned.length > 0 && (
            <p className="text-xs text-slate-500">Sin turno: {shiftView.unassigned.map((a) => a.code).join(', ')}</p>
          )}
        </div>
      )}

      {canManage && (
        <>
          <form className="grid gap-3 md:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5" onSubmit={(e) => {
            e.preventDefault();
            void opsApi.createAsset({ ...form, departmentId: form.departmentId || filterDept || undefined }).then(() => { reload(); setMsg('Activo registrado'); });
          }}>
            <input required className={inputCls} placeholder="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input required className={inputCls} placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className={inputCls} value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value })}>
              {['PATRULLA', 'MOTO', 'EQUIPO', 'RADIO', 'OTRO'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <button type="submit" className={btnCls}>Agregar activo</button>
          </form>
          <form className="grid gap-3 md:grid-cols-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5" onSubmit={(e) => {
            e.preventDefault();
            void opsApi.assignInventory(assign.assetId, { officerId: assign.officerId, turno: assign.turno }).then(() => { reload(); setMsg('Activo asignado al turno'); });
          }}>
            <select required className={inputCls} value={assign.assetId} onChange={(e) => setAssign({ ...assign, assetId: e.target.value })}>
              <option value="">Activo</option>
              {(items as AssetRow[]).map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
            <select required className={inputCls} value={assign.officerId} onChange={(e) => setAssign({ ...assign, officerId: e.target.value })}>
              <option value="">Funcionario</option>
              {deptOfficers.map((o) => <option key={o.id} value={o.id}>{o.nombres} {o.apellidos}</option>)}
            </select>
            <select className={inputCls} value={assign.turno} onChange={(e) => setAssign({ ...assign, turno: e.target.value })}>
              <option value="08:00-16:00">08:00-16:00</option>
              <option value="16:00-00:00">16:00-00:00</option>
              <option value="00:00-08:00">00:00-08:00</option>
            </select>
            <button type="submit" className={btnCls}>Asignar a turno</button>
          </form>
        </>
      )}

      <div className="space-y-2">
        {(items as AssetRow[]).map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-4 py-3 text-sm">
            <span>{a.code} — {a.name} · {a.assetType} · {a.status}{a.department ? ` · ${a.department.name}` : ''}{a.turno ? ` · turno ${a.turno}` : ''}{a.assignedOfficer ? ` · ${a.assignedOfficer.nombres} ${a.assignedOfficer.apellidos}` : ''}</span>
            {canManage && a.assignedOfficer && (
              <button type="button" className="text-xs text-amber-400" onClick={() => void opsApi.releaseInventory(a.id).then(() => { reload(); setMsg('Activo liberado'); })}>Liberar</button>
            )}
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function ArmoryPanel() {
  const session = getSession();
  const canManage = hasPermission(session?.permissions, SITOP_PERMISSIONS.ARMORY_MANAGE);
  const [weapons, setWeapons] = useState<unknown[]>([]);
  const [officers, setOfficers] = useState<Array<{ id: string; nombres: string; apellidos: string }>>([]);
  const [form, setForm] = useState({ serialNumber: '', tipo: 'Pistola', marca: '' });
  const [assign, setAssign] = useState({ weaponId: '', officerId: '', turno: '' });
  const [historyWeaponId, setHistoryWeaponId] = useState<string | null>(null);
  const [history, setHistory] = useState<unknown[]>([]);
  const [msg, setMsg] = useState('');

  function reloadWeapons() {
    void opsApi.listWeapons().then(setWeapons);
  }

  useEffect(() => {
    void Promise.all([opsApi.listWeapons(), searchOfficers()]).then(([w, o]) => { setWeapons(w); setOfficers(o as typeof officers); });
  }, []);

  type WeaponRow = {
    id: string;
    serialNumber: string;
    tipo: string;
    status: string;
    assignments: Array<{
      id: string;
      officer: { nombres: string; apellidos: string };
    }>;
  };

  return (
    <Shell title="Parque de Armas" subtitle="Serial, asignación por turno, devolución e historial.">
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      {canManage && (
        <>
          <form className="grid gap-3 md:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5" onSubmit={(e) => {
            e.preventDefault();
            void opsApi.createWeapon(form).then(() => { reloadWeapons(); setMsg('Arma registrada'); });
          }}>
            <input required className={inputCls} placeholder="Serial" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
            <input required className={inputCls} placeholder="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
            <button type="submit" className={btnCls}>Registrar arma</button>
          </form>
          <form className="grid gap-3 md:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5" onSubmit={(e) => {
            e.preventDefault();
            void opsApi.assignWeapon(assign.weaponId, { officerId: assign.officerId, turno: assign.turno }).then(() => { reloadWeapons(); setMsg('Arma asignada'); });
          }}>
            <select required className={inputCls} value={assign.weaponId} onChange={(e) => setAssign({ ...assign, weaponId: e.target.value })}>
              <option value="">Arma disponible</option>
              {(weapons as WeaponRow[]).filter((w) => w.status === 'DISPONIBLE').map((w) => <option key={w.id} value={w.id}>{w.serialNumber}</option>)}
            </select>
            <select required className={inputCls} value={assign.officerId} onChange={(e) => setAssign({ ...assign, officerId: e.target.value })}>
              <option value="">Funcionario</option>
              {officers.map((o) => <option key={o.id} value={o.id}>{o.nombres} {o.apellidos}</option>)}
            </select>
            <button type="submit" className={btnCls}>Asignar arma</button>
          </form>
        </>
      )}
      <div className="space-y-2">
        {(weapons as WeaponRow[]).map((w) => {
          const active = w.assignments[0];
          return (
            <div key={w.id} className="rounded-lg border border-slate-800 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-slate-100">{w.serialNumber} — {w.tipo} · <span className={w.status === 'DISPONIBLE' ? 'text-emerald-400' : 'text-orange-400'}>{w.status}</span></p>
                <div className="flex gap-2">
                  <button type="button" className="text-xs text-cyan-400" onClick={() => void opsApi.weaponHistory(w.id).then((h) => { setHistoryWeaponId(w.id); setHistory(h); })}>Historial</button>
                  {canManage && active && (
                    <button type="button" className="text-xs text-amber-400" onClick={() => void opsApi.returnWeapon(active.id).then(() => { reloadWeapons(); setMsg('Arma devuelta'); })}>Devolver</button>
                  )}
                </div>
              </div>
              {active && <p className="text-xs text-slate-500">Asignada a: {active.officer.nombres} {active.officer.apellidos}</p>}
            </div>
          );
        })}
      </div>
      {historyWeaponId && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Historial de asignaciones</h3>
            <button type="button" className="text-xs text-slate-500" onClick={() => setHistoryWeaponId(null)}>Cerrar</button>
          </div>
          {(history as Array<{ assignedAt: string; returnedAt: string | null; turno: string | null; officer: { nombres: string; apellidos: string; cedula: string } }>).map((h, i) => (
            <p key={i} className="text-xs text-slate-400">
              {h.officer.nombres} {h.officer.apellidos} ({h.officer.cedula}) · {new Date(h.assignedAt).toLocaleString()}
              {h.returnedAt ? ` → devuelta ${new Date(h.returnedAt).toLocaleString()}` : ' · ACTIVA'}
              {h.turno ? ` · turno ${h.turno}` : ''}
            </p>
          ))}
        </div>
      )}
    </Shell>
  );
}
