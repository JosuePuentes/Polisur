'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchRrhhCatalogs, searchOfficers, createOfficer, setOfficerCredentials, updateOfficer, updateOfficerPermissions, createDepartment, createSquad, transferOfficer, listPendingGraduates } from '@/lib/api/rrhh';
import { getSession } from '@/lib/auth';
import { hasPermission, PERMISSION_LABELS, SITOP_PERMISSIONS, type SitopPermission } from '@/lib/permissions';
import type { CreateOfficerPayload, OfficerRecord, RrhhCatalogs } from '@/lib/types/rrhh.types';

const RANGE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Director General' },
  { value: 'JEFE_DEPARTAMENTO', label: 'Jefe de Departamento' },
  { value: 'OFICIAL_ACTIVO', label: 'Oficial Activo' },
  { value: 'DISCENTE', label: 'Discente' },
];

const EMPTY_FORM: CreateOfficerPayload = {
  cedula: '',
  nombres: '',
  apellidos: '',
  rangeRole: 'OFICIAL_ACTIVO',
  credentialNumber: '',
  departmentId: '',
  squadId: '',
  promocionId: '',
  telefono: '',
  email: '',
  fechaNacimiento: '',
  direccion: '',
  grado: '',
  fechaIngreso: '',
  password: '',
  permissions: [],
};

export function RrhhPanel() {
  const session = getSession();
  const [catalogs, setCatalogs] = useState<RrhhCatalogs | null>(null);
  const [query, setQuery] = useState('');
  const [officers, setOfficers] = useState<OfficerRecord[]>([]);
  const [selected, setSelected] = useState<OfficerRecord | null>(null);
  const [form, setForm] = useState<CreateOfficerPayload>(EMPTY_FORM);
  const [credentialPassword, setCredentialPassword] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<SitopPermission[]>([]);
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [squadName, setSquadName] = useState('');
  const [squadCallsign, setSquadCallsign] = useState('');
  const [squadDeptId, setSquadDeptId] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferDeptId, setTransferDeptId] = useState('');
  const [transferSquadId, setTransferSquadId] = useState('');
  const [pendingGraduates, setPendingGraduates] = useState<OfficerRecord[]>([]);
  const [graduateTransfer, setGraduateTransfer] = useState<Record<string, { departmentId: string; squadId: string }>>({});

  const canManage = hasPermission(session?.permissions, SITOP_PERMISSIONS.RRHH_MANAGE);
  const canCredentials = hasPermission(session?.permissions, SITOP_PERMISSIONS.RRHH_CREDENTIALS);

  const transferSquads = useMemo(() => {
    return catalogs?.departments.find((d) => d.id === transferDeptId)?.squads ?? [];
  }, [catalogs, transferDeptId]);

  const squads = useMemo(() => {
    return catalogs?.departments.find((d) => d.id === form.departmentId)?.squads ?? [];
  }, [catalogs, form.departmentId]);

  async function handleCreateDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!deptCode.trim() || !deptName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createDepartment({ code: deptCode, name: deptName });
      setDeptCode('');
      setDeptName('');
      setMessage('Departamento creado');
      await loadCatalogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear departamento');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSquad(e: React.FormEvent) {
    e.preventDefault();
    if (!squadDeptId || !squadName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createSquad({
        departmentId: squadDeptId,
        name: squadName,
        callsign: squadCallsign || undefined,
      });
      setSquadName('');
      setSquadCallsign('');
      setMessage('Escuadra creada');
      await loadCatalogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear escuadra');
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogs() {
    const data = await fetchRrhhCatalogs();
    setCatalogs(data);
    if (!form.departmentId && data.departments[0]) {
      setForm((prev) => ({ ...prev, departmentId: data.departments[0].id }));
    }
    await loadPendingGraduates(data);
  }

  async function loadPendingGraduates(catalog?: RrhhCatalogs) {
    if (!canManage) return;
    try {
      const list = await listPendingGraduates();
      const cat = catalog ?? catalogs;
      setPendingGraduates(list);
      if (cat) {
        const opDepts = cat.departments.filter((d) => d.code !== 'DECT');
        setGraduateTransfer((prev) => {
          const next = { ...prev };
          for (const g of list) {
            if (!next[g.id]) {
              next[g.id] = { departmentId: opDepts[0]?.id ?? '', squadId: '' };
            }
          }
          return next;
        });
      }
    } catch {
      setPendingGraduates([]);
    }
  }

  async function handleAssignGraduate(officerId: string) {
    const payload = graduateTransfer[officerId];
    if (!payload?.departmentId) return;
    setLoading(true);
    setError(null);
    try {
      await transferOfficer(officerId, {
        departmentId: payload.departmentId,
        squadId: payload.squadId || null,
      });
      setMessage('Egresado asignado a comando operativo');
      await loadPendingGraduates();
      await runSearch(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar egresado');
    } finally {
      setLoading(false);
    }
  }

  async function runSearch(searchQuery?: string) {
    setLoading(true);
    setError(null);
    try {
      const results = await searchOfficers(searchQuery);
      setOfficers(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalogs().catch(() => setError('No se pudieron cargar catálogos RRHH'));
    void runSearch();
  }, []);

  function selectOfficer(officer: OfficerRecord) {
    setSelected(officer);
    setSelectedPermissions(officer.permissions as SitopPermission[]);
    setCredentialPassword('');
    setTransferDeptId(officer.departmentId);
    setTransferSquadId(officer.squadId ?? '');
    setMode('search');
  }

  function togglePermission(permission: SitopPermission) {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createOfficer({
        ...form,
        squadId: form.squadId || undefined,
        promocionId: form.promocionId || undefined,
        password: form.password || undefined,
      });
      setMessage(`Funcionario ${created.cedula} registrado en RRHH`);
      setForm({ ...EMPTY_FORM, departmentId: form.departmentId, permissions: [] });
      setMode('search');
      await runSearch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar');
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePermissions() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await updateOfficerPermissions(selected.id, selectedPermissions);
      setSelected(updated);
      setMessage('Permisos actualizados. El funcionario debe volver a iniciar sesión.');
      await runSearch(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar permisos');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetCredentials() {
    if (!selected || credentialPassword.length < 8) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await setOfficerCredentials(selected.id, credentialPassword);
      setSelected(updated);
      setCredentialPassword('');
      setMessage(`Clave asignada. El funcionario ingresa con cédula ${updated.cedula}`);
      await runSearch(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar clave');
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer() {
    if (!selected || !transferDeptId) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await transferOfficer(selected.id, {
        departmentId: transferDeptId,
        squadId: transferSquadId || null,
      });
      setSelected(updated);
      setMessage(`Transferido a ${updated.department.name}`);
      await runSearch(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo transferir');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateOfficer() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await updateOfficer(selected.id, form);
      setSelected(updated);
      setMessage('Datos del funcionario actualizados');
      await runSearch(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-500/80">RRHH</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-100">Recursos Humanos y Credenciales</h1>
        <p className="mt-1 text-sm text-slate-400">Registro completo del funcionario, permisos y clave de acceso (cédula + contraseña).</p>
      </header>

      {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">{error}</div>}

      {canManage && pendingGraduates.length > 0 && catalogs && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-amber-200">Bandeja de egresados — pendientes de asignación</h2>
          <p className="text-xs text-slate-400">Oficiales graduados en DECT sin escuadra operativa. Asigne comando y escuadra destino.</p>
          {pendingGraduates.map((g) => {
            const opDepts = catalogs.departments.filter((d) => d.code !== 'DECT');
            const gt = graduateTransfer[g.id] ?? { departmentId: '', squadId: '' };
            const squadsForDept = opDepts.find((d) => d.id === gt.departmentId)?.squads ?? [];
            return (
              <div key={g.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm">
                <span className="text-slate-200">{g.nombres} {g.apellidos} · {g.cedula}</span>
                <select className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs" value={gt.departmentId} onChange={(e) => setGraduateTransfer({ ...graduateTransfer, [g.id]: { departmentId: e.target.value, squadId: '' } })}>
                  {opDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs" value={gt.squadId} onChange={(e) => setGraduateTransfer({ ...graduateTransfer, [g.id]: { ...gt, squadId: e.target.value } })}>
                  <option value="">Sin escuadra</option>
                  {squadsForDept.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" disabled={loading} onClick={() => void handleAssignGraduate(g.id)} className="rounded bg-cyan-800 px-2 py-1 text-xs text-white">Asignar</button>
              </div>
            );
          })}
        </section>
      )}

      {canManage && catalogs && (
        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={(e) => void handleCreateDepartment(e)} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-slate-200">Nuevo departamento</h2>
            <input required placeholder="Código (ej. DIAN)" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <input required placeholder="Nombre del comando" value={deptName} onChange={(e) => setDeptName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-cyan-700 px-3 py-2 text-sm text-white">Crear departamento</button>
          </form>
          <form onSubmit={(e) => void handleCreateSquad(e)} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-slate-200">Nueva escuadra</h2>
            <select required value={squadDeptId} onChange={(e) => setSquadDeptId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Departamento</option>
              {catalogs.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input required placeholder="Nombre escuadra" value={squadName} onChange={(e) => setSquadName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <input placeholder="Indicativo (callsign)" value={squadCallsign} onChange={(e) => setSquadCallsign(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-cyan-700 px-3 py-2 text-sm text-white">Crear escuadra</button>
          </form>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode('search')} className={`rounded-lg px-4 py-2 text-sm ${mode === 'search' ? 'bg-cyan-900/40 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}>Buscar funcionarios</button>
        {canManage && (
          <button type="button" onClick={() => { setMode('create'); setSelected(null); setForm({ ...EMPTY_FORM, departmentId: catalogs?.departments[0]?.id ?? '' }); }} className={`rounded-lg px-4 py-2 text-sm ${mode === 'create' ? 'bg-cyan-900/40 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}>Nuevo funcionario</button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="space-y-4">
          {mode === 'search' && (
            <>
              <div className="flex gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cédula, nombre o credencial" className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
                <button type="button" onClick={() => void runSearch(query)} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm text-white">Buscar</button>
              </div>
              <div className="space-y-2">
                {officers.map((officer) => (
                  <button key={officer.id} type="button" onClick={() => selectOfficer(officer)} className={`w-full rounded-xl border px-4 py-3 text-left ${selected?.id === officer.id ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-slate-800 bg-slate-900/40'}`}>
                    <p className="font-medium text-slate-100">{officer.nombres} {officer.apellidos}</p>
                    <p className="text-xs text-slate-400">Cédula {officer.cedula} · {officer.rangeRole.replace(/_/g, ' ')} · {officer.department.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{officer.hasCredentials ? 'Clave configurada' : 'Sin clave de acceso'}</p>
                  </button>
                ))}
                {!loading && officers.length === 0 && <p className="text-sm text-slate-500">Sin resultados</p>}
              </div>
            </>
          )}

          {mode === 'create' && canManage && catalogs && (
            <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-semibold text-slate-200">Datos del funcionario</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <input required placeholder="Cédula" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                <input required placeholder="Nº credencial" value={form.credentialNumber} onChange={(e) => setForm({ ...form, credentialNumber: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                <input required placeholder="Nombres" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                <input required placeholder="Apellidos" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                <select value={form.rangeRole} onChange={(e) => setForm({ ...form, rangeRole: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  {RANGE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <input placeholder="Grado" value={form.grado} onChange={(e) => setForm({ ...form, grado: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                <input type="date" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                <input type="date" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                <input placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                <select required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value, squadId: '' })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  {catalogs.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={form.squadId} onChange={(e) => setForm({ ...form, squadId: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="">Sin escuadra</option>
                  {squads.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input placeholder="Clave inicial (opcional)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </div>
              <PermissionGrid catalog={catalogs.permissionCatalog} selected={form.permissions} onToggle={togglePermission} />
              <button type="submit" disabled={loading} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white">Registrar en RRHH</button>
            </form>
          )}
        </section>

        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          {!selected ? (
            <p className="text-sm text-slate-500">Seleccione un funcionario para asignar clave y permisos.</p>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">{selected.nombres} {selected.apellidos}</h2>
                <p className="text-xs text-slate-400">Cédula {selected.cedula}</p>
                <p className="text-xs text-slate-500">{selected.grado ?? 'Sin grado'} · {selected.department.name}</p>
              </div>

              {canCredentials && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Clave de acceso</h3>
                  <p className="text-xs text-slate-500">Usuario de login: <strong className="text-slate-300">{selected.cedula}</strong></p>
                  <input type="password" minLength={8} placeholder="Nueva contraseña (mín. 8)" value={credentialPassword} onChange={(e) => setCredentialPassword(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                  <button type="button" disabled={loading || credentialPassword.length < 8} onClick={() => void handleSetCredentials()} className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white">Asignar clave</button>
                </div>
              )}

              {canManage && catalogs && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transferencia de comando</h3>
                  <select value={transferDeptId} onChange={(e) => setTransferDeptId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                    {catalogs.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select value={transferSquadId} onChange={(e) => setTransferSquadId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                    <option value="">Sin escuadra</option>
                    {transferSquads.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button type="button" disabled={loading || transferDeptId === selected.departmentId && (transferSquadId || '') === (selected.squadId ?? '')} onClick={() => void handleTransfer()} className="w-full rounded-lg bg-amber-800 px-3 py-2 text-sm text-white">Transferir funcionario</button>
                </div>
              )}

              {canManage && catalogs && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Permisos del módulo</h3>
                  <PermissionGrid catalog={catalogs.permissionCatalog} selected={selectedPermissions} onToggle={togglePermission} />
                  <button type="button" disabled={loading} onClick={() => void handleSavePermissions()} className="w-full rounded-lg bg-cyan-700 px-3 py-2 text-sm text-white">Guardar permisos</button>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function PermissionGrid({ catalog, selected, onToggle }: { catalog: SitopPermission[]; selected: SitopPermission[]; onToggle: (p: SitopPermission) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {catalog.map((permission) => (
        <label key={permission} className="flex items-start gap-2 rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-300">
          <input type="checkbox" checked={selected.includes(permission)} onChange={() => onToggle(permission)} className="mt-0.5" />
          <span>{PERMISSION_LABELS[permission]}</span>
        </label>
      ))}
    </div>
  );
}
