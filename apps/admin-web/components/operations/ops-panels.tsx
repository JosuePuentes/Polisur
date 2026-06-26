'use client';

import { useEffect, useState } from 'react';
import { opsApi } from '@/lib/api/operations';
import { fetchRrhhCatalogs, searchOfficers } from '@/lib/api/rrhh';
import { PARROQUIAS_SAN_FRANCISCO, SECTORES_REFERENCIA } from '@/lib/constants/public-portal';

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
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ nombres: '', apellidos: '', cedula: '', cellNumber: '', delitoInicial: '' });
  const [hearing, setHearing] = useState({ fecha: '', tribunal: '', resultado: '' });

  function reload() {
    void opsApi.listDetainees().then(setList);
  }

  useEffect(() => { reload(); }, []);

  return (
    <Shell title="Detenidos y Calabozos" subtitle="Registro de presos, historial de delitos y audiencias.">
      <form className="grid gap-3 md:grid-cols-2 rounded-xl border border-slate-800 bg-slate-900/40 p-5" onSubmit={(e) => {
        e.preventDefault();
        void opsApi.createDetainee(form).then(reload);
      }}>
        <input required className={inputCls} placeholder="Nombres" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} />
        <input required className={inputCls} placeholder="Apellidos" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
        <input className={inputCls} placeholder="Cédula" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} />
        <input className={inputCls} placeholder="Celda" value={form.cellNumber} onChange={(e) => setForm({ ...form, cellNumber: e.target.value })} />
        <input className={`md:col-span-2 ${inputCls}`} placeholder="Delito inicial" value={form.delitoInicial} onChange={(e) => setForm({ ...form, delitoInicial: e.target.value })} />
        <button type="submit" className={btnCls}>Ingresar detenido</button>
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

export function ShiftsPanel() {
  const [roster, setRoster] = useState<Array<{ officer: { id: string; nombres: string; apellidos: string; grado: string | null }; shift: { id: string; horaInicio: string; horaFin: string } | null; dotStatus: string }>>([]);
  const [form, setForm] = useState({ officerId: '', departmentId: '', fecha: new Date().toISOString().slice(0, 10), horaInicio: '08:00', horaFin: '16:00' });
  const [officers, setOfficers] = useState<Array<{ id: string; nombres: string; apellidos: string }>>([]);
  const [catalogs, setCatalogs] = useState<Awaited<ReturnType<typeof fetchRrhhCatalogs>> | null>(null);

  function reload() {
    void opsApi.activeRoster().then((r) => setRoster(r as typeof roster));
  }

  useEffect(() => {
    void Promise.all([opsApi.activeRoster(), searchOfficers(), fetchRrhhCatalogs()]).then(([r, o, c]) => {
      setRoster(r as typeof roster);
      setOfficers(o as typeof officers);
      setCatalogs(c);
      if (c.departments[0]) setForm((f) => ({ ...f, departmentId: c.departments[0].id }));
    });
  }, []);

  const dotColor = { gris: 'bg-slate-500', naranja: 'bg-orange-500', verde: 'bg-emerald-500' };

  return (
    <Shell title="Guardias y Funcionarios Activos" subtitle="Gris: sin guardia · Naranja: en guardia sin marcar llegada · Verde: presente en servicio.">
      <form className="grid gap-3 md:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5" onSubmit={(e) => {
        e.preventDefault();
        void opsApi.createShift(form).then(reload);
      }}>
        <select required className={inputCls} value={form.officerId} onChange={(e) => setForm({ ...form, officerId: e.target.value })}>
          <option value="">Funcionario</option>
          {officers.map((o) => <option key={o.id} value={o.id}>{o.nombres} {o.apellidos}</option>)}
        </select>
        <input type="date" className={inputCls} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
        <input className={inputCls} value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} />
        <button type="submit" className={btnCls}>Programar guardia</button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {roster.map(({ officer, shift, dotStatus }) => (
          <div key={officer.id} className="flex items-center gap-3 rounded-lg border border-slate-800 px-4 py-3">
            <span className={`h-3 w-3 rounded-full ${dotColor[dotStatus as keyof typeof dotColor] ?? dotColor.gris}`} />
            <div className="flex-1 text-sm">
              <p className="text-slate-100">{officer.nombres} {officer.apellidos}</p>
              <p className="text-xs text-slate-500">{officer.grado ?? 'Oficial'} {shift ? `· ${shift.horaInicio}-${shift.horaFin}` : '· Sin guardia hoy'}</p>
            </div>
            {shift && dotStatus === 'naranja' && (
              <button type="button" className="text-xs text-cyan-400" onClick={() => void opsApi.checkInShift(shift.id).then(reload)}>Marcar llegada</button>
            )}
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function CommandsPanel() {
  const [commands, setCommands] = useState<unknown[]>([]);
  useEffect(() => { void opsApi.listCommands().then(setCommands); }, []);
  return (
    <Shell title="Comandos y Divisiones" subtitle="Centro de acopio, investigaciones, caninos, violencia de género, motorizados, etc.">
      <div className="space-y-3">
        {(commands as Array<{ id: string; code: string; name: string; address: string | null; _count: { officers: number }; squads: unknown[]; controlPoints: unknown[] }>).map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-800 px-5 py-4">
            <p className="font-semibold text-slate-100">{c.name} <span className="font-mono text-xs text-cyan-400">({c.code})</span></p>
            <p className="text-sm text-slate-400">{c.address ?? 'Sin dirección'} · {c._count.officers} funcionarios · {(c.squads as unknown[]).length} escuadras · {(c.controlPoints as unknown[]).length} puntos de control</p>
          </div>
        ))}
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
  const [items, setItems] = useState<unknown[]>([]);
  const [summary, setSummary] = useState<unknown[]>([]);
  const [form, setForm] = useState({ code: '', name: '', assetType: 'PATRULLA' });
  useEffect(() => {
    void Promise.all([opsApi.listInventory(), opsApi.inventorySummary()]).then(([i, s]) => { setItems(i); setSummary(s); });
  }, []);
  return (
    <Shell title="Logística e Inventario" subtitle="Patrullas, motos, radios y equipamiento institucional.">
      <div className="flex flex-wrap gap-2 text-xs">
        {(summary as Array<{ assetType: string; status: string; _count: { id: number } }>).map((s, i) => (
          <span key={i} className="rounded-full border border-slate-700 px-3 py-1 text-slate-400">{s.assetType}: {s._count.id} ({s.status})</span>
        ))}
      </div>
      <form className="grid gap-3 md:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5" onSubmit={(e) => {
        e.preventDefault();
        void opsApi.createAsset(form).then(() => opsApi.listInventory().then(setItems));
      }}>
        <input required className={inputCls} placeholder="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input required className={inputCls} placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className={inputCls} value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value })}>
          {['PATRULLA', 'MOTO', 'EQUIPO', 'RADIO', 'OTRO'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <button type="submit" className={btnCls}>Agregar activo</button>
      </form>
      <div className="space-y-2">
        {(items as Array<{ code: string; name: string; assetType: string; status: string }>).map((a) => (
          <div key={a.code} className="rounded-lg border border-slate-800 px-4 py-3 text-sm">{a.code} — {a.name} · {a.assetType} · {a.status}</div>
        ))}
      </div>
    </Shell>
  );
}

export function ArmoryPanel() {
  const [weapons, setWeapons] = useState<unknown[]>([]);
  const [officers, setOfficers] = useState<Array<{ id: string; nombres: string; apellidos: string }>>([]);
  const [form, setForm] = useState({ serialNumber: '', tipo: 'Pistola', marca: '' });
  const [assign, setAssign] = useState({ weaponId: '', officerId: '', turno: '' });

  useEffect(() => {
    void Promise.all([opsApi.listWeapons(), searchOfficers()]).then(([w, o]) => { setWeapons(w); setOfficers(o as typeof officers); });
  }, []);

  return (
    <Shell title="Parque de Armas" subtitle="Serial, asignación por turno y historial de entrega/devolución.">
      <form className="grid gap-3 md:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5" onSubmit={(e) => {
        e.preventDefault();
        void opsApi.createWeapon(form).then(() => opsApi.listWeapons().then(setWeapons));
      }}>
        <input required className={inputCls} placeholder="Serial" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
        <input required className={inputCls} placeholder="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
        <button type="submit" className={btnCls}>Registrar arma</button>
      </form>
      <form className="grid gap-3 md:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5" onSubmit={(e) => {
        e.preventDefault();
        void opsApi.assignWeapon(assign.weaponId, { officerId: assign.officerId, turno: assign.turno }).then(() => opsApi.listWeapons().then(setWeapons));
      }}>
        <select required className={inputCls} value={assign.weaponId} onChange={(e) => setAssign({ ...assign, weaponId: e.target.value })}>
          <option value="">Arma disponible</option>
          {(weapons as Array<{ id: string; serialNumber: string; status: string }>).filter((w) => w.status === 'DISPONIBLE').map((w) => <option key={w.id} value={w.id}>{w.serialNumber}</option>)}
        </select>
        <select required className={inputCls} value={assign.officerId} onChange={(e) => setAssign({ ...assign, officerId: e.target.value })}>
          <option value="">Funcionario</option>
          {officers.map((o) => <option key={o.id} value={o.id}>{o.nombres} {o.apellidos}</option>)}
        </select>
        <button type="submit" className={btnCls}>Asignar arma</button>
      </form>
      <div className="space-y-2">
        {(weapons as Array<{ id: string; serialNumber: string; tipo: string; status: string; assignments: Array<{ officer: { nombres: string; apellidos: string } }> }>).map((w) => (
          <div key={w.id} className="rounded-lg border border-slate-800 px-4 py-3 text-sm">
            <p className="text-slate-100">{w.serialNumber} — {w.tipo} · <span className={w.status === 'DISPONIBLE' ? 'text-emerald-400' : 'text-orange-400'}>{w.status}</span></p>
            {w.assignments[0] && <p className="text-xs text-slate-500">Asignada a: {w.assignments[0].officer.nombres} {w.assignments[0].officer.apellidos}</p>}
          </div>
        ))}
      </div>
    </Shell>
  );
}
