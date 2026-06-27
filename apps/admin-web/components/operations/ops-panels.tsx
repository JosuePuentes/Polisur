'use client';

import { useEffect, useMemo, useState } from 'react';
import { opsApi } from '@/lib/api/operations';
import { fetchIncidents } from '@/lib/api/incidents';
import { fetchRrhhCatalogs, searchOfficers, setSquadLeader } from '@/lib/api/rrhh';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';
import { PARROQUIAS_SAN_FRANCISCO, SECTORES_REFERENCIA } from '@/lib/constants/public-portal';
import { PatrolMap, type PatrolMapRecord } from '@/components/operations/patrol-map';
import {
  MinuteVehiclesEditor,
  RegistrySearch,
} from '@/components/operations/registry-search';
import {
  PeaceQuadrantsMap,
  type PeaceQuadrantMapRecord,
} from '@/components/operations/peace-quadrants-map';
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
  const session = getSession();
  const isSuperAdmin = session?.rangeRole === 'SUPER_ADMIN';

  const [patrols, setPatrols] = useState<PatrolMapRecord[]>([]);
  const [officers, setOfficers] = useState<Array<{ id: string; nombres: string; apellidos: string; cedula: string; departmentId?: string }>>([]);
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
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [objDesc, setObjDesc] = useState('');
  const [objIdentifier, setObjIdentifier] = useState('');
  const [minuteVehicles, setMinuteVehicles] = useState<
    Array<{ plate: string; vehicleType: string; ownerCedula: string; notes: string }>
  >([]);
  const [selectedPatrol, setSelectedPatrol] = useState('');
  const [highlightedPatrolId, setHighlightedPatrolId] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const departments = catalogs?.departments ?? [];

  const departmentOfficers = useMemo(
    () =>
      officers.filter(
        (officer) => !form.departmentId || officer.departmentId === form.departmentId,
      ),
    [officers, form.departmentId],
  );

  const squads = departments.find((d) => d.id === form.departmentId)?.squads ?? [];

  const draftOrigin =
    form.latitude !== null && form.longitude !== null
      ? { lat: form.latitude, lng: form.longitude }
      : null;

  function loadData() {
    void Promise.all([opsApi.listPatrols(), fetchRrhhCatalogs(), searchOfficers()]).then(
      ([p, c, o]) => {
        setPatrols(p as PatrolMapRecord[]);
        setCatalogs(c);
        setOfficers(o as typeof officers);

        const defaultDept =
          c.departments.find((d) => d.id === session?.departmentId) ??
          c.departments[0];

        if (defaultDept) {
          setForm((f) => ({
            ...f,
            departmentId: f.departmentId || defaultDept.id,
          }));
        }
      },
    );
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setGpsStatus('Ubicación registrada para la minuta.');
      },
      () => setGpsStatus('No se pudo obtener la ubicación GPS.'),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <Shell title="Patrullaje y Minutas" subtitle="Registre la minuta de salida para abrir un procedimiento. La escuadra queda en actuación hasta la minuta de llegada en Procedimientos en curso.">
      <PatrolMap
        patrols={patrols}
        selectedCuadrante={form.cuadrante}
        draftOrigin={draftOrigin}
        highlightedPatrolId={highlightedPatrolId}
        onSelectCuadrante={(cuadrante) => setForm((f) => ({ ...f, cuadrante }))}
      />

      <RegistrySearch
        title="Buscador operativo"
        hint="Cédulas, placas, bicicletas y matrículas registradas en minutas, detenidos, denuncias e inventario."
      />

      <form
        className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void opsApi
            .createPatrol({
              patrolType: form.patrolType,
              parroquia: form.parroquia,
              cuadrante: form.cuadrante,
              descripcion: form.descripcion,
              departmentId: form.departmentId,
              squadId: form.squadId || undefined,
              latitude: form.latitude ?? undefined,
              longitude: form.longitude ?? undefined,
              officerIds: form.officerIds.length
                ? form.officerIds
                : departmentOfficers.slice(0, 1).map((o) => o.id),
              leaderOfficerId: form.leaderOfficerId || undefined,
              vehicles: minuteVehicles
                .filter((v) => v.plate.trim().length >= 3)
                .map((v) => ({
                  plate: v.plate.trim(),
                  vehicleType: v.vehicleType,
                  ownerCedula: v.ownerCedula.trim() || undefined,
                  notes: v.notes.trim() || undefined,
                })),
            })
            .then(() => {
              setMsg('Minuta de salida registrada — procedimiento en curso abierto');
              setForm((f) => ({ ...f, descripcion: '', latitude: null, longitude: null }));
              setMinuteVehicles([]);
              setGpsStatus(null);
              return opsApi.listPatrols();
            })
            .then((list) => setPatrols(list as PatrolMapRecord[]));
        }}
      >
        <h2 className="text-sm font-semibold text-slate-200">Minuta de salida</h2>
        <p className="text-xs text-amber-400/80">
          Al registrar la salida se abre un procedimiento en curso y la escuadra queda bloqueada hasta la llegada.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <select className={inputCls} value={form.patrolType} onChange={(e) => setForm({ ...form, patrolType: e.target.value })}>
            <option value="MINUTA">Minuta</option>
            <option value="PATRULLAJE">Patrullaje</option>
            <option value="PROCEDIMIENTO_MIXTO">Procedimiento mixto</option>
          </select>
          <select
            className={inputCls}
            value={form.departmentId}
            disabled={!isSuperAdmin && departments.length <= 1}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value, squadId: '', officerIds: [] })}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select className={inputCls} value={form.squadId} onChange={(e) => setForm({ ...form, squadId: e.target.value })}>
            <option value="">Escuadra principal</option>
            {squads.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className={inputCls} value={form.parroquia} onChange={(e) => setForm({ ...form, parroquia: e.target.value })}>
            {PARROQUIAS_SAN_FRANCISCO.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select
            className={inputCls}
            value={form.cuadrante}
            onChange={(e) => setForm({ ...form, cuadrante: e.target.value })}
          >
            {SECTORES_REFERENCIA.map((sector) => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
          <div className="flex flex-col gap-2">
            <button type="button" className={btnCls} onClick={captureGps}>
              Usar mi ubicación (origen)
            </button>
            {gpsStatus && <p className="text-xs text-slate-400">{gpsStatus}</p>}
            {draftOrigin && (
              <p className="font-mono text-[10px] text-cyan-400/80">
                GPS: {draftOrigin.lat.toFixed(5)}, {draftOrigin.lng.toFixed(5)}
              </p>
            )}
          </div>
          <textarea required minLength={10} className={`md:col-span-2 ${inputCls}`} placeholder="Relato operativo" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <div>
          <p className="mb-2 text-xs text-slate-400">
            Funcionarios de su comando asignados a la comisión:
          </p>
          <div className="grid gap-2 sm:grid-cols-2 max-h-40 overflow-y-auto">
            {departmentOfficers.map((o) => (
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
        <MinuteVehiclesEditor vehicles={minuteVehicles} onChange={setMinuteVehicles} />
        <button type="submit" className={btnCls}>Registrar minuta de salida</button>
        {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Objeto recuperado</h2>
        <select className={inputCls} value={selectedPatrol} onChange={(e) => setSelectedPatrol(e.target.value)}>
          <option value="">Seleccione minuta</option>
          {patrols.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>
        <input className={inputCls} placeholder="Descripción del objeto" value={objDesc} onChange={(e) => setObjDesc(e.target.value)} />
        <input
          className={inputCls}
          placeholder="Placa / serial / matrícula (opcional, ej. bicicleta)"
          value={objIdentifier}
          onChange={(e) => setObjIdentifier(e.target.value)}
        />
        <button
          type="button"
          className={btnCls}
          disabled={!selectedPatrol || !objDesc}
          onClick={() =>
            void opsApi
              .addRecoveredObject(selectedPatrol, {
                description: objDesc,
                identifier: objIdentifier.trim() || undefined,
              })
              .then(() => {
                setMsg('Objeto registrado');
                setObjDesc('');
                setObjIdentifier('');
              })
          }
        >
          Agregar objeto
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-200">Minutas de su comando</h2>
        {patrols.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setHighlightedPatrolId(p.id)}
            className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
              highlightedPatrolId === p.id
                ? 'border-amber-500/40 bg-amber-950/20'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <p className="font-mono text-cyan-300">{p.code}</p>
            <p className="text-slate-400">{p.patrolType} · Destino: {p.cuadrante}</p>
            <p className="text-xs text-slate-500 line-clamp-2">{p.descripcion}</p>
          </button>
        ))}
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
  const isSuperAdmin = session?.rangeRole === 'SUPER_ADMIN';
  const canManage = hasPermission(session?.permissions, SITOP_PERMISSIONS.SHIFTS_MANAGE);
  const today = new Date().toISOString().slice(0, 10);

  type ShiftRow = {
    id: string;
    horaInicio: string;
    horaFin: string;
    status: string;
    checkedInAt?: string | null;
    officer: {
      id: string;
      nombres: string;
      apellidos: string;
      grado: string | null;
      cedula: string;
      department: { name: string; code: string };
      squad: { name: string; callsign: string | null } | null;
    };
    department: { name: string; code: string };
  };

  const [dayShifts, setDayShifts] = useState<ShiftRow[]>([]);
  const [activeToday, setActiveToday] = useState<ShiftRow[]>([]);
  const [selectedDay, setSelectedDay] = useState(today);
  const [filterDept, setFilterDept] = useState('');
  const [form, setForm] = useState({
    officerId: '',
    departmentId: '',
    fecha: today,
    horaInicio: '08:00',
    horaFin: '16:00',
  });
  const [officers, setOfficers] = useState<Array<{ id: string; nombres: string; apellidos: string; departmentId: string }>>([]);
  const [catalogs, setCatalogs] = useState<Awaited<ReturnType<typeof fetchRrhhCatalogs>> | null>(null);

  const days = useMemo(() => weekDates(), []);
  const isToday = selectedDay === today;

  function reload() {
    const dept = filterDept || undefined;
    void opsApi.listShifts(selectedDay, dept).then((rows) => setDayShifts(rows as ShiftRow[]));
    if (isToday) {
      void opsApi.listShifts(today, dept, true).then((rows) => setActiveToday(rows as ShiftRow[]));
    } else {
      setActiveToday([]);
    }
  }

  useEffect(() => {
    void Promise.all([searchOfficers(), fetchRrhhCatalogs()]).then(([o, c]) => {
      setOfficers(o as typeof officers);
      setCatalogs(c);
      const defaultDept =
        c.departments.find((d) => d.id === session?.departmentId) ?? c.departments[0];
      if (defaultDept && !isSuperAdmin) {
        setForm((f) => ({ ...f, departmentId: defaultDept.id }));
        setFilterDept(defaultDept.id);
      } else if (defaultDept) {
        setForm((f) => ({ ...f, departmentId: f.departmentId || defaultDept.id }));
      }
    });
  }, []);

  useEffect(() => {
    reload();
  }, [filterDept, selectedDay]);

  const dotColor = { gris: 'bg-slate-500', naranja: 'bg-orange-500', verde: 'bg-emerald-500' };
  const deptOfficers = filterDept ? officers.filter((o) => o.departmentId === filterDept) : officers;

  function statusLabel(status: string): string {
    if (status === 'ON_DUTY_ACTIVE') return 'En servicio';
    if (status === 'ON_DUTY_PENDING') return 'Pendiente check-in';
    return 'Fuera de turno';
  }

  function ShiftRecordRow({ shift, showCheckIn }: { shift: ShiftRow; showCheckIn?: boolean }) {
    const command = shift.department?.name ?? shift.officer.department.name;
    const commandCode = shift.department?.code ?? shift.officer.department.code;
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 px-4 py-3 text-sm">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            shift.status === 'ON_DUTY_ACTIVE'
              ? dotColor.verde
              : shift.status === 'ON_DUTY_PENDING'
                ? dotColor.naranja
                : dotColor.gris
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-100">
            {shift.officer.nombres} {shift.officer.apellidos}
          </p>
          <p className="text-xs text-cyan-300/90">
            {commandCode} · {command}
            {shift.officer.squad?.name ? ` · ${shift.officer.squad.name}` : ''}
          </p>
          <p className="text-xs text-slate-500">
            {shift.horaInicio}–{shift.horaFin} · {statusLabel(shift.status)}
            {shift.checkedInAt
              ? ` · Check-in ${new Date(shift.checkedInAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </p>
        </div>
        {showCheckIn && canManage && shift.status === 'ON_DUTY_PENDING' && (
          <button
            type="button"
            className="text-xs text-cyan-400 hover:text-cyan-300"
            onClick={() => handleGpsCheckIn(shift.id, reload)}
          >
            Marcar llegada
          </button>
        )}
      </div>
    );
  }

  return (
    <Shell
      title="Guardias Activas"
      subtitle="Personal en servicio hoy, registro histórico por fecha y comando asignado."
    >
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <select
          className={inputCls + ' max-w-xs'}
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          disabled={!isSuperAdmin && (catalogs?.departments.length ?? 0) <= 1}
        >
          <option value="">Todos los comandos</option>
          {catalogs?.departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <input
          type="date"
          className={inputCls + ' max-w-[11rem]'}
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
        />
        <button
          type="button"
          className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
          onClick={() => setSelectedDay(today)}
        >
          Hoy
        </button>
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
        <form
          className="grid gap-3 md:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void opsApi.createShift({ ...form, fecha: selectedDay }).then(reload);
          }}
        >
          <select required className={inputCls} value={form.officerId} onChange={(e) => setForm({ ...form, officerId: e.target.value })}>
            <option value="">Funcionario</option>
            {deptOfficers.map((o) => (
              <option key={o.id} value={o.id}>{o.nombres} {o.apellidos}</option>
            ))}
          </select>
          <select className={inputCls} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
            {catalogs?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input className={inputCls} value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} />
          <input className={inputCls} value={form.horaFin} onChange={(e) => setForm({ ...form, horaFin: e.target.value })} />
          <button type="submit" className={btnCls}>Programar guardia ({selectedDay})</button>
        </form>
      )}

      {isToday && (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4">
          <h2 className="mb-3 text-sm font-semibold text-emerald-200">
            En servicio ahora ({activeToday.length})
          </h2>
          <div className="space-y-2">
            {activeToday.map((shift) => (
              <ShiftRecordRow key={shift.id} shift={shift} showCheckIn />
            ))}
            {activeToday.length === 0 && (
              <p className="text-xs text-slate-500">Ningún funcionario con check-in activo en este momento.</p>
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">
          Registro del día {selectedDay}
          {!isToday && <span className="ml-2 text-xs font-normal text-slate-500">(histórico)</span>}
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Guardias programadas y personal que estuvo activo en esta fecha, con su comando o división.
        </p>
        <div className="space-y-2">
          {dayShifts.map((shift) => (
            <ShiftRecordRow key={shift.id} shift={shift} showCheckIn={isToday} />
          ))}
          {dayShifts.length === 0 && (
            <p className="text-xs text-slate-500">Sin guardias registradas para esta fecha.</p>
          )}
        </div>
      </section>

      {isToday && dayShifts.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">Resumen por estado</h2>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${dotColor.verde}`} />
              En servicio: {dayShifts.filter((s) => s.status === 'ON_DUTY_ACTIVE').length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${dotColor.naranja}`} />
              Pendiente: {dayShifts.filter((s) => s.status === 'ON_DUTY_PENDING').length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${dotColor.gris}`} />
              Total programados: {dayShifts.length}
            </span>
          </div>
        </section>
      )}
    </Shell>
  );
}

function requestGpsLocation(
  onSuccess: (coords: { latitude: number; longitude: number }) => void,
  onError: (message: string) => void,
): void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError('Este dispositivo no soporta geolocalización.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) =>
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
    () => onError('No se pudo obtener la ubicación GPS. Active el GPS e intente de nuevo.'),
    { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
  );
}

function formatCoords(lat: number | null | undefined, lng: number | null | undefined): string {
  if (lat == null || lng == null) return 'Sin coordenadas GPS';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

type CommandFormState = {
  name: string;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  commanderId: string;
};

const emptyCommandForm = (): CommandFormState => ({
  name: '',
  description: '',
  address: '',
  latitude: null,
  longitude: null,
  commanderId: '',
});

type CommandRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
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

function CommandGpsField({
  latitude,
  longitude,
  gpsStatus,
  onCapture,
  onClear,
}: {
  latitude: number | null;
  longitude: number | null;
  gpsStatus: string | null;
  onCapture: () => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2 md:col-span-3">
      <p className="text-xs text-slate-400">
        Active el GPS del dispositivo para registrar la ubicación exacta del comando en el mapa.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btnCls} onClick={onCapture}>
          {latitude != null ? 'Actualizar ubicación GPS' : 'Activar GPS y capturar ubicación'}
        </button>
        {latitude != null && (
          <button
            type="button"
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800"
            onClick={onClear}
          >
            Quitar GPS
          </button>
        )}
        <span className="font-mono text-xs text-cyan-300/90">{formatCoords(latitude, longitude)}</span>
        {latitude != null && longitude != null && (
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            Ver en mapa
          </a>
        )}
      </div>
      {gpsStatus && <p className="text-xs text-slate-500">{gpsStatus}</p>}
    </div>
  );
}

export function CommandsPanel() {
  const session = getSession();
  const isSuperAdmin = session?.rangeRole === 'SUPER_ADMIN';
  const canManage = hasPermission(session?.permissions, SITOP_PERMISSIONS.COMMANDS_MANAGE);
  const [commands, setCommands] = useState<CommandRow[]>([]);
  const [officers, setOfficers] = useState<Array<{ id: string; nombres: string; apellidos: string; departmentId: string }>>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CommandFormState>(emptyCommandForm());
  const [createForm, setCreateForm] = useState({ code: '', ...emptyCommandForm() });
  const [editGpsStatus, setEditGpsStatus] = useState<string | null>(null);
  const [createGpsStatus, setCreateGpsStatus] = useState<string | null>(null);
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
      description: cmd.description ?? '',
      address: cmd.address ?? '',
      latitude: cmd.latitude,
      longitude: cmd.longitude,
      commanderId: cmd.commander?.id ?? '',
    });
    setEditGpsStatus(null);
    setCpForm({ name: '', address: '' });
  }

  function captureEditGps() {
    setEditGpsStatus('Obteniendo ubicación…');
    requestGpsLocation(
      (coords) => {
        setEditForm((f) => ({ ...f, ...coords }));
        setEditGpsStatus('Ubicación GPS registrada.');
      },
      (error) => setEditGpsStatus(error),
    );
  }

  function captureCreateGps() {
    setCreateGpsStatus('Obteniendo ubicación…');
    requestGpsLocation(
      (coords) => {
        setCreateForm((f) => ({ ...f, ...coords }));
        setCreateGpsStatus('Ubicación GPS registrada.');
      },
      (error) => setCreateGpsStatus(error),
    );
  }

  return (
    <Shell
      title="Comandos y Divisiones"
      subtitle="Registro de divisiones, dirección, ubicación GPS y delitos que atiende cada comando."
    >
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}

      {canManage && isSuperAdmin && (
        <form
          className="grid gap-3 rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-5 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            void opsApi
              .createCommand({
                code: createForm.code,
                name: createForm.name,
                description: createForm.description || undefined,
                address: createForm.address || undefined,
                latitude: createForm.latitude ?? undefined,
                longitude: createForm.longitude ?? undefined,
              })
              .then(() => {
                setCreateForm({ code: '', ...emptyCommandForm() });
                setCreateGpsStatus(null);
                setMsg('Comando registrado correctamente');
                reload();
              })
              .catch((err: Error) => setMsg(err.message));
          }}
        >
          <p className="text-sm font-semibold text-cyan-200 md:col-span-3">Registrar nuevo comando / división</p>
          <input
            required
            className={inputCls}
            placeholder="Código (ej. DIVINV)"
            value={createForm.code}
            onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
          />
          <input
            required
            className={inputCls}
            placeholder="Nombre de la división"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Dirección física"
            value={createForm.address}
            onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
          />
          <textarea
            className={inputCls + ' md:col-span-3 min-h-[4.5rem]'}
            placeholder="Delitos o materia que atiende (ej. narcotráfico, violencia de género, hurto…)"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
          />
          <CommandGpsField
            latitude={createForm.latitude}
            longitude={createForm.longitude}
            gpsStatus={createGpsStatus}
            onCapture={captureCreateGps}
            onClear={() => {
              setCreateForm((f) => ({ ...f, latitude: null, longitude: null }));
              setCreateGpsStatus(null);
            }}
          />
          <button type="submit" className={btnCls + ' md:col-span-3 max-w-xs'}>
            Registrar comando
          </button>
        </form>
      )}

      <div className="space-y-3">
        {commands.map((c) => {
          const deptOfficers = officers.filter((o) => o.departmentId === c.id);
          const isOpen = expandedId === c.id;
          return (
            <div key={c.id} className="rounded-xl border border-slate-800 px-5 py-4">
              <button type="button" className="w-full text-left" onClick={() => openCommand(c)}>
                <p className="font-semibold text-slate-100">
                  {c.name}{' '}
                  <span className="font-mono text-xs text-cyan-400">({c.code})</span>
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {c.address ?? 'Sin dirección'} · GPS: {formatCoords(c.latitude, c.longitude)}
                </p>
                {c.description && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    Atiende: {c.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  Jefe: {c.commander ? `${c.commander.nombres} ${c.commander.apellidos}` : 'Sin asignar'}
                  · {c._count.officers} funcionarios · {c.squads.length} escuadras · {c.controlPoints.length} puntos
                </p>
              </button>

              {isOpen && (
                <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                  {!canManage && (
                    <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                      <p><span className="text-slate-500">División:</span> {c.name}</p>
                      <p><span className="text-slate-500">Dirección:</span> {c.address ?? '—'}</p>
                      <p className="md:col-span-2">
                        <span className="text-slate-500">Delitos que atiende:</span>{' '}
                        {c.description ?? 'Sin especificar'}
                      </p>
                      <p>
                        <span className="text-slate-500">Ubicación GPS:</span>{' '}
                        {formatCoords(c.latitude, c.longitude)}
                      </p>
                    </div>
                  )}

                  {canManage && (
                    <form
                      className="grid gap-2 md:grid-cols-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void opsApi
                          .updateCommand(c.id, {
                            name: editForm.name,
                            description: editForm.description || null,
                            address: editForm.address || null,
                            latitude: editForm.latitude,
                            longitude: editForm.longitude,
                            commanderId: editForm.commanderId || null,
                          })
                          .then(() => {
                            setMsg('Comando actualizado');
                            reload();
                          })
                          .catch((err: Error) => setMsg(err.message));
                      }}
                    >
                      <input
                        required
                        className={inputCls}
                        placeholder="Nombre de la división"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                      <input
                        className={inputCls}
                        placeholder="Dirección física"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      />
                      <select
                        className={inputCls}
                        value={editForm.commanderId}
                        onChange={(e) => setEditForm({ ...editForm, commanderId: e.target.value })}
                      >
                        <option value="">Sin jefe de comando</option>
                        {deptOfficers.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.nombres} {o.apellidos}
                          </option>
                        ))}
                      </select>
                      <textarea
                        className={inputCls + ' md:col-span-3 min-h-[4.5rem]'}
                        placeholder="Delitos o materia que atiende esta división"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      />
                      <CommandGpsField
                        latitude={editForm.latitude}
                        longitude={editForm.longitude}
                        gpsStatus={editGpsStatus}
                        onCapture={captureEditGps}
                        onClear={() => {
                          setEditForm((f) => ({ ...f, latitude: null, longitude: null }));
                          setEditGpsStatus(null);
                        }}
                      />
                      <button type="submit" className={btnCls + ' md:col-span-3 max-w-xs'}>
                        Guardar comando
                      </button>
                    </form>
                  )}

                  {canManage && (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Escuadras y jefes</p>
                        {c.squads.map((sq) => (
                          <div key={sq.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm">
                            <span className="text-slate-200">{sq.name}</span>
                            <select
                              className={inputCls + ' max-w-xs'}
                              value={sq.leader?.id ?? ''}
                              onChange={(e) =>
                                void setSquadLeader(sq.id, e.target.value || null).then(() => {
                                  setMsg('Jefe de escuadra asignado');
                                  reload();
                                })
                              }
                            >
                              <option value="">Sin jefe</option>
                              {deptOfficers.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.nombres} {o.apellidos}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Puntos de control</p>
                        {c.controlPoints.map((cp) => (
                          <p key={cp.id} className="text-xs text-slate-400">
                            {cp.name} — {cp.address ?? 'Sin dirección'}
                          </p>
                        ))}
                        <form
                          className="grid gap-2 md:grid-cols-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void opsApi
                              .createControlPoint({
                                departmentId: c.id,
                                name: cpForm.name,
                                address: cpForm.address || undefined,
                              })
                              .then(() => {
                                setCpForm({ name: '', address: '' });
                                setMsg('Punto de control creado');
                                reload();
                              });
                          }}
                        >
                          <input
                            required
                            className={inputCls}
                            placeholder="Nombre punto"
                            value={cpForm.name}
                            onChange={(e) => setCpForm({ ...cpForm, name: e.target.value })}
                          />
                          <input
                            className={inputCls}
                            placeholder="Dirección"
                            value={cpForm.address}
                            onChange={(e) => setCpForm({ ...cpForm, address: e.target.value })}
                          />
                          <button type="submit" className={btnCls}>
                            Agregar punto
                          </button>
                        </form>
                      </div>
                    </>
                  )}
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
  const session = getSession();
  const canManage = hasPermission(session?.permissions, SITOP_PERMISSIONS.QUADRANTS_MANAGE);

  const defaultNames = SECTORES_REFERENCIA.filter((s) => s.startsWith('Cuadrante de Paz'));

  const [list, setList] = useState<PeaceQuadrantMapRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [draftPolygon, setDraftPolygon] = useState<[number, number][]>([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    name: defaultNames[0] as string,
    code: 'CP-01',
    parroquia: PARROQUIAS_SAN_FRANCISCO[0] as string,
    customName: '',
  });

  function reload() {
    void opsApi.listQuadrants().then((rows) => {
      setList(rows);
      if (rows.length > 0 && !selectedId) {
        setSelectedId(rows[0].id);
      }
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function codeFromName(name: string): string {
    const match = name.match(/(\d+)/);
    return match ? `CP-${match[1].padStart(2, '0')}` : name.slice(0, 8).toUpperCase();
  }

  function handleNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      code: codeFromName(name),
    }));
  }

  function handleMapClick(lat: number, lng: number) {
    if (!drawMode) return;
    setDraftPolygon((points) => [...points, [lat, lng]]);
  }

  function resetDraft() {
    setDraftPolygon([]);
    setDrawMode(false);
  }

  const selected = list.find((q) => q.id === selectedId) ?? null;
  const zoneReady = draftPolygon.length >= 3;
  const nameTaken = list.some((q) => q.name === form.name || q.code === form.code);

  return (
    <Shell
      title="Cuadrantes de Paz"
      subtitle="Mapa con zonas delimitadas, nombres oficiales del municipio y registro geográfico obligatorio."
    >
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}

      <PeaceQuadrantsMap
        quadrants={list}
        selectedId={selectedId}
        draftPolygon={draftPolygon}
        drawMode={drawMode}
        onMapClick={handleMapClick}
        onSelectQuadrant={setSelectedId}
      />

      <div className="flex flex-wrap gap-2">
        {list.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setSelectedId(q.id)}
            className={`rounded-lg px-3 py-1.5 text-xs ${
              selectedId === q.id
                ? 'bg-cyan-900/40 text-cyan-300 ring-1 ring-cyan-500/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {q.name.replace('Cuadrante de Paz ', 'CP-')}
          </button>
        ))}
      </div>

      {selected && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
          <h2 className="font-semibold text-slate-100">{selected.name}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {selected.code} · {selected.parroquia}
            {selected.centerLat != null && selected.centerLng != null
              ? ` · Centro ${selected.centerLat.toFixed(5)}, ${selected.centerLng.toFixed(5)}`
              : ''}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Zona delimitada con {(selected.boundaryPolygon?.length ?? 0)} puntos en el mapa.
          </p>
        </section>
      )}

      {canManage && (
        <form
          className="space-y-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!zoneReady) {
              setMsg('Debe delimitar la zona en el mapa con al menos 3 puntos.');
              return;
            }
            const finalName = form.name === 'Otro sector (especificar en descripción)'
              ? form.customName.trim()
              : form.name;
            if (!finalName) {
              setMsg('Indique el nombre del cuadrante.');
              return;
            }
            void opsApi
              .createQuadrant({
                code: codeFromName(finalName),
                name: finalName,
                parroquia: form.parroquia,
                boundaryPolygon: draftPolygon,
              })
              .then(() => {
                setMsg('Cuadrante registrado con su zona en el mapa.');
                resetDraft();
                setForm({
                  name: defaultNames[0] as string,
                  code: 'CP-01',
                  parroquia: PARROQUIAS_SAN_FRANCISCO[0] as string,
                  customName: '',
                });
                reload();
              })
              .catch((err: Error) => setMsg(err.message));
          }}
        >
          <p className="text-sm font-semibold text-cyan-200">Agregar cuadrante de paz</p>

          <div className="grid gap-3 md:grid-cols-3">
            <select
              required
              className={inputCls}
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            >
              {defaultNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value="Otro sector (especificar en descripción)">Otro (nombre personalizado)</option>
            </select>

            {form.name === 'Otro sector (especificar en descripción)' && (
              <input
                required
                className={inputCls}
                placeholder="Nombre del cuadrante"
                value={form.customName}
                onChange={(e) => setForm({ ...form, customName: e.target.value })}
              />
            )}

            <input
              readOnly
              className={inputCls + ' font-mono text-slate-400'}
              value={form.name === 'Otro sector (especificar en descripción)' ? codeFromName(form.customName) : form.code}
            />

            <select
              className={inputCls}
              value={form.parroquia}
              onChange={(e) => setForm({ ...form, parroquia: e.target.value })}
            >
              {PARROQUIAS_SAN_FRANCISCO.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {nameTaken && form.name !== 'Otro sector (especificar en descripción)' && (
            <p className="text-xs text-amber-400">
              Este cuadrante ya está registrado. Elija otro nombre o un sector personalizado.
            </p>
          )}

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs font-medium text-slate-300">Delimitar zona en el mapa (obligatorio)</p>
            <p className="mt-1 text-xs text-slate-500">
              Active el modo dibujo y haga clic en el mapa para marcar cada vértice del perímetro que abarca el cuadrante.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={drawMode ? 'rounded-lg bg-amber-700 px-3 py-2 text-sm text-white' : btnCls}
                onClick={() => {
                  setDrawMode((v) => !v);
                  setMsg('');
                }}
              >
                {drawMode ? 'Dibujando zona…' : 'Activar dibujo en mapa'}
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800"
                onClick={() => setDraftPolygon((points) => points.slice(0, -1))}
                disabled={draftPolygon.length === 0}
              >
                Deshacer último punto
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800"
                onClick={resetDraft}
                disabled={draftPolygon.length === 0 && !drawMode}
              >
                Limpiar zona
              </button>
              <span className="text-xs text-slate-500">
                {draftPolygon.length} punto{draftPolygon.length === 1 ? '' : 's'}
                {zoneReady ? ' · zona lista' : ' · mínimo 3 puntos'}
              </span>
            </div>
          </div>

          <button
            type="submit"
            className={btnCls}
            disabled={!zoneReady || (nameTaken && form.name !== 'Otro sector (especificar en descripción)')}
          >
            Registrar cuadrante con zona delimitada
          </button>
        </form>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-200">Cuadrantes registrados ({list.length})</h2>
        {list.map((q) => (
          <div
            key={q.id}
            className={`rounded-lg border px-4 py-3 text-sm ${
              selectedId === q.id ? 'border-cyan-500/40 bg-cyan-950/20 text-slate-200' : 'border-slate-800 text-slate-300'
            }`}
          >
            <p className="font-medium">{q.name}</p>
            <p className="text-xs text-slate-500">
              {q.code} · {q.parroquia}
              {q.centerLat != null && q.centerLng != null
                ? ` · ${q.centerLat.toFixed(4)}, ${q.centerLng.toFixed(4)}`
                : ' · sin centro GPS'}
              {' · '}
              {q.boundaryPolygon?.length ?? 0} vértices
            </p>
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-xs text-slate-500">
            Sin cuadrantes en base de datos. Se cargarán los 8 oficiales al reiniciar la API o puede registrarlos manualmente.
          </p>
        )}
      </section>
    </Shell>
  );
}

export function LogisticsPanel() {
  const session = getSession();
  const isSuperAdmin = session?.rangeRole === 'SUPER_ADMIN';
  const canManage = hasPermission(session?.permissions, SITOP_PERMISSIONS.LOGISTICS_MANAGE);
  const [items, setItems] = useState<unknown[]>([]);
  const [summary, setSummary] = useState<unknown[]>([]);
  const [shiftView, setShiftView] = useState<{
    fecha: string;
    turnos: Array<{
      turno: string;
      officers: Array<{ nombres: string; apellidos: string }>;
      assets: Array<{ code: string; name: string; assetType: string }>;
    }>;
    unassigned: Array<{ code: string; name: string }>;
    atCommandPool: Array<{ code: string; name: string }>;
  } | null>(null);
  const [catalogs, setCatalogs] = useState<Awaited<ReturnType<typeof fetchRrhhCatalogs>> | null>(null);
  const [filterDept, setFilterDept] = useState('');
  const [filterTurno, setFilterTurno] = useState('');
  const [officers, setOfficers] = useState<Array<{ id: string; nombres: string; apellidos: string; departmentId: string }>>([]);
  const [form, setForm] = useState({ code: '', name: '', assetType: 'PATRULLA' });
  const [assign, setAssign] = useState({ assetId: '', officerId: '', turno: '08:00-16:00' });
  const [msg, setMsg] = useState('');

  const selectedDept = catalogs?.departments.find((d) => d.id === filterDept) ?? null;
  const commandSelected = Boolean(filterDept);

  function reload() {
    if (!filterDept) {
      setItems([]);
      setSummary([]);
      setShiftView(null);
      return;
    }
    void Promise.all([
      opsApi.listInventory(filterDept, filterTurno || undefined),
      opsApi.inventorySummary(filterDept),
      opsApi.inventoryByShift(filterDept),
    ]).then(([i, s, shift]) => {
      setItems(i);
      setSummary(s);
      setShiftView(shift as typeof shiftView);
    });
  }

  useEffect(() => {
    void Promise.all([fetchRrhhCatalogs(), searchOfficers()]).then(([c, o]) => {
      setCatalogs(c);
      setOfficers(o as typeof officers);
      const defaultDept =
        c.departments.find((d) => d.id === session?.departmentId) ?? c.departments[0];
      if (defaultDept) {
        setFilterDept(defaultDept.id);
      }
    });
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDept, filterTurno]);

  type AssetRow = {
    id: string;
    code: string;
    name: string;
    assetType: string;
    status: string;
    turno: string | null;
    assignedOfficer: { nombres: string; apellidos: string } | null;
    department: { name: string; code: string } | null;
  };

  const deptOfficers = filterDept ? officers.filter((o) => o.departmentId === filterDept) : [];
  const assets = items as AssetRow[];
  const withOfficer = assets.filter((a) => a.assignedOfficer);
  const atCommand = assets.filter((a) => !a.assignedOfficer);

  function custodyLabel(asset: AssetRow): string {
    if (asset.assignedOfficer) {
      return `Funcionario: ${asset.assignedOfficer.nombres} ${asset.assignedOfficer.apellidos}`;
    }
    if (asset.department) {
      return `Custodia del comando: ${asset.department.code} · ${asset.department.name}`;
    }
    return 'Sin comando asignado';
  }

  return (
    <Shell
      title="Logística e Inventario"
      subtitle="Los activos pertenecen a un comando; la entrega a funcionario es opcional."
    >
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Comando / división</label>
          <select
            className={inputCls + ' max-w-xs'}
            value={filterDept}
            onChange={(e) => {
              setFilterDept(e.target.value);
              setAssign({ assetId: '', officerId: '', turno: '08:00-16:00' });
            }}
            disabled={!isSuperAdmin && (catalogs?.departments.length ?? 0) <= 1}
          >
            <option value="">Seleccione un comando…</option>
            {catalogs?.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Turno (filtro)</label>
          <select
            className={inputCls + ' max-w-xs'}
            value={filterTurno}
            onChange={(e) => setFilterTurno(e.target.value)}
            disabled={!commandSelected}
          >
            <option value="">Todos los turnos</option>
            <option value="08:00-16:00">08:00-16:00</option>
            <option value="16:00-00:00">16:00-00:00</option>
            <option value="00:00-08:00">00:00-08:00</option>
          </select>
        </div>
      </div>

      {!commandSelected && (
        <p className="text-sm text-slate-500">
          Seleccione un comando para ver el inventario, registrar activos y gestionar asignaciones.
        </p>
      )}

      {commandSelected && (
        <>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 px-4 py-3 text-sm text-cyan-100">
            Inventario de <span className="font-semibold">{selectedDept?.name}</span>
            {' · '}
            {withOfficer.length} entregados a funcionarios · {atCommand.length} en custodia del comando
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {(summary as Array<{ assetType: string; status: string; _count: { id: number } }>).map((s, i) => (
              <span key={i} className="rounded-full border border-slate-700 px-3 py-1 text-slate-400">
                {s.assetType}: {s._count.id} ({s.status})
              </span>
            ))}
          </div>

          {shiftView && (
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h2 className="text-sm font-semibold text-slate-200">Inventario por turno — {shiftView.fecha}</h2>
              {shiftView.turnos.map((t) => (
                <div key={t.turno} className="rounded-lg border border-slate-800 px-3 py-2">
                  <p className="text-xs font-semibold text-cyan-400">Turno {t.turno}</p>
                  <p className="text-xs text-slate-500">
                    Oficiales: {t.officers.map((o) => `${o.nombres} ${o.apellidos}`).join(', ') || 'Ninguno'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Activos: {t.assets.map((a) => a.code).join(', ') || 'Sin asignar'}
                  </p>
                </div>
              ))}
              {shiftView.atCommandPool.length > 0 && (
                <p className="text-xs text-emerald-400/90">
                  En custodia del comando: {shiftView.atCommandPool.map((a) => a.code).join(', ')}
                </p>
              )}
              {shiftView.unassigned.length > 0 && (
                <p className="text-xs text-slate-500">
                  Sin turno ni funcionario: {shiftView.unassigned.map((a) => a.code).join(', ')}
                </p>
              )}
            </div>
          )}

          {canManage && (
            <>
              <form
                className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5 md:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void opsApi
                    .createAsset({ ...form, departmentId: filterDept })
                    .then(() => {
                      reload();
                      setForm({ code: '', name: '', assetType: 'PATRULLA' });
                      setMsg(`Activo registrado en ${selectedDept?.name ?? 'el comando'}`);
                    })
                    .catch((err: Error) => setMsg(err.message));
                }}
              >
                <p className="text-sm font-semibold text-slate-200 md:col-span-3">
                  Registrar activo en {selectedDept?.name}
                </p>
                <input
                  required
                  className={inputCls}
                  placeholder="Código"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
                <input
                  required
                  className={inputCls}
                  placeholder="Nombre"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <select
                  className={inputCls}
                  value={form.assetType}
                  onChange={(e) => setForm({ ...form, assetType: e.target.value })}
                >
                  {['PATRULLA', 'MOTO', 'EQUIPO', 'RADIO', 'OTRO'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <button type="submit" className={btnCls + ' md:col-span-3 max-w-xs'}>
                  Agregar al comando
                </button>
              </form>

              <form
                className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5 md:grid-cols-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void opsApi
                    .assignInventory(assign.assetId, {
                      officerId: assign.officerId || null,
                      turno: assign.turno || undefined,
                    })
                    .then(() => {
                      reload();
                      setAssign({ assetId: '', officerId: '', turno: '08:00-16:00' });
                      setMsg(
                        assign.officerId
                          ? 'Activo entregado al funcionario'
                          : `Activo queda en custodia de ${selectedDept?.name ?? 'el comando'}`,
                      );
                    })
                    .catch((err: Error) => setMsg(err.message));
                }}
              >
                <p className="text-sm font-semibold text-slate-200 md:col-span-4">
                  Asignar activo del comando
                </p>
                <select
                  required
                  className={inputCls}
                  value={assign.assetId}
                  onChange={(e) => setAssign({ ...assign, assetId: e.target.value })}
                >
                  <option value="">Activo del comando</option>
                  {assets
                    .filter((a) => !a.assignedOfficer)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                </select>
                <select
                  className={inputCls}
                  value={assign.officerId}
                  onChange={(e) => setAssign({ ...assign, officerId: e.target.value })}
                >
                  <option value="">Sin funcionario (custodia del comando)</option>
                  {deptOfficers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombres} {o.apellidos}
                    </option>
                  ))}
                </select>
                <select
                  className={inputCls}
                  value={assign.turno}
                  onChange={(e) => setAssign({ ...assign, turno: e.target.value })}
                >
                  <option value="">Sin turno</option>
                  <option value="08:00-16:00">08:00-16:00</option>
                  <option value="16:00-00:00">16:00-00:00</option>
                  <option value="00:00-08:00">00:00-08:00</option>
                </select>
                <button type="submit" className={btnCls}>
                  {assign.officerId ? 'Entregar a funcionario' : 'Confirmar en comando'}
                </button>
              </form>
            </>
          )}

          <div className="space-y-2">
            {assets.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-100">
                    {a.code} — {a.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.assetType} · {a.status}
                    {a.turno ? ` · turno ${a.turno}` : ''}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      a.assignedOfficer ? 'text-cyan-300' : 'text-emerald-300/90'
                    }`}
                  >
                    {custodyLabel(a)}
                  </p>
                </div>
                {canManage && a.assignedOfficer && (
                  <button
                    type="button"
                    className="text-xs text-amber-400 hover:text-amber-300"
                    onClick={() =>
                      void opsApi.releaseInventory(a.id).then(() => {
                        reload();
                        setMsg('Activo devuelto a custodia del comando');
                      })
                    }
                  >
                    Devolver al comando
                  </button>
                )}
              </div>
            ))}
            {assets.length === 0 && (
              <p className="text-xs text-slate-500">Este comando no tiene activos registrados.</p>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}

export function ArmoryPanel() {
  const session = getSession();
  const canManage = hasPermission(session?.permissions, SITOP_PERMISSIONS.ARMORY_MANAGE);
  const [weapons, setWeapons] = useState<unknown[]>([]);
  const [officers, setOfficers] = useState<
    Array<{ id: string; nombres: string; apellidos: string; cedula: string; credentialNumber: string }>
  >([]);
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
      officer: { nombres: string; apellidos: string; cedula: string; credentialNumber: string };
    }>;
  };

  function formatOfficerIdentity(officer: {
    nombres: string;
    apellidos: string;
    cedula?: string;
    credentialNumber?: string;
  }): string {
    const parts = [`${officer.nombres} ${officer.apellidos}`];
    if (officer.cedula) parts.push(`C.I. ${officer.cedula}`);
    if (officer.credentialNumber) parts.push(`Cred. ${officer.credentialNumber}`);
    return parts.join(' · ');
  }

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
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {formatOfficerIdentity(o)}
                </option>
              ))}
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
              {active && (
                <p className="text-xs text-slate-500">
                  Asignada a: {formatOfficerIdentity(active.officer)}
                </p>
              )}
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
          {(history as Array<{
            assignedAt: string;
            returnedAt: string | null;
            turno: string | null;
            officer: { nombres: string; apellidos: string; cedula: string; credentialNumber: string };
          }>).map((h, i) => (
            <p key={i} className="text-xs text-slate-400">
              {formatOfficerIdentity(h.officer)} · {new Date(h.assignedAt).toLocaleString()}
              {h.returnedAt ? ` → devuelta ${new Date(h.returnedAt).toLocaleString()}` : ' · ACTIVA'}
              {h.turno ? ` · turno ${h.turno}` : ''}
            </p>
          ))}
        </div>
      )}
    </Shell>
  );
}
