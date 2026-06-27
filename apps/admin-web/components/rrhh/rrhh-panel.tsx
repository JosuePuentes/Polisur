'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  activateOfficerAccount,
  assignOfficerToCommand,
  createDepartment,
  createOfficerProfileForm,
  createSquad,
  fetchRrhhCatalogs,
  listPendingGraduates,
  searchOfficers,
  setOfficerCredentials,
  transferOfficer,
  updateOfficerPermissions,
} from '@/lib/api/rrhh';
import { getSession } from '@/lib/auth';
import {
  hasPermission,
  PERMISSION_LABELS,
  SITOP_PERMISSIONS,
  type SitopPermission,
} from '@/lib/permissions';
import type {
  CreateOfficerProfilePayload,
  OfficerRecord,
  RrhhCatalogs,
} from '@/lib/types/rrhh.types';
import { OfficerAvatar } from '@/components/rrhh/officer-avatar';

const DIVISION_ROLE_OPTIONS = [
  { value: 'DIRECTOR', label: 'Director de división' },
  { value: 'SUB_DIRECTOR', label: 'Subdirector' },
  { value: 'ORDINARIO', label: 'Funcionario ordinario' },
] as const;

const EMPTY_PROFILE: CreateOfficerProfilePayload = {
  cedula: '',
  nombres: '',
  apellidos: '',
  telefono: '',
  email: '',
  fechaNacimiento: '',
  direccion: '',
  grado: '',
  fechaIngreso: '',
};

type DivisionRoleValue = (typeof DIVISION_ROLE_OPTIONS)[number]['value'];

export function RrhhPanel() {
  const session = getSession();
  const [catalogs, setCatalogs] = useState<RrhhCatalogs | null>(null);
  const [query, setQuery] = useState('');
  const [officers, setOfficers] = useState<OfficerRecord[]>([]);
  const [selected, setSelected] = useState<OfficerRecord | null>(null);
  const [profileForm, setProfileForm] = useState<CreateOfficerProfilePayload>(EMPTY_PROFILE);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [credentialPassword, setCredentialPassword] = useState('');
  const [activatePassword, setActivatePassword] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<SitopPermission[]>([]);
  const [activatePermissions, setActivatePermissions] = useState<SitopPermission[]>([]);
  const [mode, setMode] = useState<'search' | 'create-profile'>('search');
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
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignSquadId, setAssignSquadId] = useState('');
  const [assignDivisionRole, setAssignDivisionRole] = useState<DivisionRoleValue>('ORDINARIO');
  const [pendingGraduates, setPendingGraduates] = useState<OfficerRecord[]>([]);
  const [graduateTransfer, setGraduateTransfer] = useState<
    Record<string, { departmentId: string; squadId: string; divisionRole: DivisionRoleValue }>
  >({});

  const canManage = hasPermission(session?.permissions, SITOP_PERMISSIONS.RRHH_MANAGE);
  const canCredentials = hasPermission(session?.permissions, SITOP_PERMISSIONS.RRHH_CREDENTIALS);
  const isSuperAdmin = session?.rangeRole === 'SUPER_ADMIN';

  const operationalDepartments = useMemo(
    () => catalogs?.departments.filter((d) => d.code !== 'DECT') ?? [],
    [catalogs],
  );

  const transferSquads = useMemo(() => {
    return catalogs?.departments.find((d) => d.id === transferDeptId)?.squads ?? [];
  }, [catalogs, transferDeptId]);

  const assignSquads = useMemo(() => {
    return operationalDepartments.find((d) => d.id === assignDeptId)?.squads ?? [];
  }, [operationalDepartments, assignDeptId]);

  const needsAssignment = selected?.divisionRole === 'SIN_ASIGNAR';
  const needsActivation = Boolean(selected && !needsAssignment && !selected.hasCredentials);

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
    const defaultDept =
      data.departments.find((d) => d.id === session?.departmentId) ??
      operationalDepartmentsFrom(data)[0];
    if (defaultDept) {
      setSquadDeptId((prev) => prev || defaultDept.id);
      setAssignDeptId((prev) => prev || defaultDept.id);
    }
    if (isSuperAdmin) {
      await loadPendingGraduates(data);
    }
  }

  function operationalDepartmentsFrom(catalog: RrhhCatalogs) {
    return catalog.departments.filter((d) => d.code !== 'DECT');
  }

  async function loadPendingGraduates(catalog?: RrhhCatalogs) {
    if (!canManage) return;
    try {
      const list = await listPendingGraduates();
      const cat = catalog ?? catalogs;
      setPendingGraduates(list);
      if (cat) {
        const opDepts = operationalDepartmentsFrom(cat);
        setGraduateTransfer((prev) => {
          const next = { ...prev };
          for (const g of list) {
            if (!next[g.id]) {
              next[g.id] = {
                departmentId: opDepts[0]?.id ?? '',
                squadId: '',
                divisionRole: 'ORDINARIO',
              };
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
      await assignOfficerToCommand(officerId, {
        departmentId: payload.departmentId,
        squadId: payload.squadId || null,
        divisionRole: payload.divisionRole,
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
    setActivatePermissions([]);
    setCredentialPassword('');
    setActivatePassword('');
    setTransferDeptId(officer.departmentId);
    setTransferSquadId(officer.squadId ?? '');
    const opDept =
      operationalDepartments.find((d) => d.id === officer.departmentId) ??
      operationalDepartments[0];
    setAssignDeptId(opDept?.id ?? '');
    setAssignSquadId(officer.squadId ?? '');
    setAssignDivisionRole(
      officer.divisionRole === 'SIN_ASIGNAR'
        ? 'ORDINARIO'
        : (officer.divisionRole as DivisionRoleValue),
    );
    setMode('search');
  }

  function togglePermission(
    permission: SitopPermission,
    target: 'selected' | 'activate' | 'profile' = 'selected',
  ) {
    if (target === 'activate') {
      setActivatePermissions((current) =>
        current.includes(permission)
          ? current.filter((item) => item !== permission)
          : [...current, permission],
      );
      return;
    }
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const payload = new FormData();
      payload.set('cedula', profileForm.cedula.trim());
      payload.set('nombres', profileForm.nombres.trim());
      payload.set('apellidos', profileForm.apellidos.trim());
      if (profileForm.telefono) payload.set('telefono', profileForm.telefono.trim());
      if (profileForm.email) payload.set('email', profileForm.email.trim());
      if (profileForm.fechaNacimiento) payload.set('fechaNacimiento', profileForm.fechaNacimiento);
      if (profileForm.direccion) payload.set('direccion', profileForm.direccion.trim());
      if (profileForm.grado) payload.set('grado', profileForm.grado.trim());
      if (profileForm.fechaIngreso) payload.set('fechaIngreso', profileForm.fechaIngreso);
      if (profilePhoto) payload.set('profile_photo', profilePhoto);

      const created = await createOfficerProfileForm(payload);
      setMessage(
        `Perfil de ${created.apellidos}, ${created.nombres} creado. Asigne comando y perfil institucional antes de activar el usuario.`,
      );
      setProfileForm(EMPTY_PROFILE);
      setProfilePhoto(null);
      setMode('search');
      await runSearch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el perfil');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignToCommand() {
    if (!selected || !assignDeptId) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await assignOfficerToCommand(selected.id, {
        departmentId: assignDeptId,
        squadId: assignSquadId || null,
        divisionRole: assignDivisionRole,
      });
      setSelected(updated);
      setMessage(
        `${updated.apellidos}, ${updated.nombres} asignado a ${updated.assignmentLabel}. Active el usuario con clave y permisos.`,
      );
      await runSearch(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar al comando');
    } finally {
      setLoading(false);
    }
  }

  async function handleActivateAccount() {
    if (!selected || activatePassword.length < 8) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await activateOfficerAccount(selected.id, {
        password: activatePassword,
        permissions: activatePermissions.length > 0 ? activatePermissions : undefined,
      });
      setSelected(updated);
      setSelectedPermissions(updated.permissions as SitopPermission[]);
      setActivatePassword('');
      setActivatePermissions([]);
      setMessage(`Usuario activado. Ingresa con cédula ${updated.cedula} y la clave asignada.`);
      await runSearch(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar el usuario');
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
      setMessage(`Clave actualizada. El funcionario ingresa con cédula ${updated.cedula}`);
      await runSearch(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar clave');
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer() {
    if (!selected) return;
    const departmentId = isSuperAdmin ? transferDeptId : selected.departmentId;
    if (!departmentId) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await transferOfficer(selected.id, {
        departmentId,
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

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-500/80">RRHH</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-100">Recursos Humanos y Credenciales</h1>
        <p className="mt-1 text-sm text-slate-400">
          Flujo: 1) crear perfil del funcionario con foto carnet · 2) asignar a comando/división con
          perfil institucional · 3) activar usuario con clave y permisos según el rol.
        </p>
      </header>

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {canManage && isSuperAdmin && pendingGraduates.length > 0 && catalogs && (
        <section className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-950/10 p-5">
          <h2 className="text-sm font-semibold text-amber-200">
            Bandeja de egresados — pendientes de asignación
          </h2>
          <p className="text-xs text-slate-400">
            Oficiales graduados sin comando operativo. Asigne división, escuadra y perfil.
          </p>
          {pendingGraduates.map((g) => {
            const gt = graduateTransfer[g.id] ?? {
              departmentId: '',
              squadId: '',
              divisionRole: 'ORDINARIO' as DivisionRoleValue,
            };
            const squadsForDept =
              operationalDepartments.find((d) => d.id === gt.departmentId)?.squads ?? [];
            return (
              <div
                key={g.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm"
              >
                <OfficerAvatar
                  photoUrl={g.profilePhotoUrl}
                  name={`${g.apellidos} ${g.nombres}`}
                  size="sm"
                />
                <span className="text-slate-200">
                  {g.apellidos}, {g.nombres} · {g.cedula}
                </span>
                <select
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                  value={gt.departmentId}
                  onChange={(e) =>
                    setGraduateTransfer({
                      ...graduateTransfer,
                      [g.id]: { ...gt, departmentId: e.target.value, squadId: '' },
                    })
                  }
                >
                  {operationalDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                  value={gt.squadId}
                  onChange={(e) =>
                    setGraduateTransfer({
                      ...graduateTransfer,
                      [g.id]: { ...gt, squadId: e.target.value },
                    })
                  }
                >
                  <option value="">Sin escuadra</option>
                  {squadsForDept.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                  value={gt.divisionRole}
                  onChange={(e) =>
                    setGraduateTransfer({
                      ...graduateTransfer,
                      [g.id]: {
                        ...gt,
                        divisionRole: e.target.value as DivisionRoleValue,
                      },
                    })
                  }
                >
                  {DIVISION_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleAssignGraduate(g.id)}
                  className="rounded bg-cyan-800 px-2 py-1 text-xs text-white"
                >
                  Asignar
                </button>
              </div>
            );
          })}
        </section>
      )}

      {canManage && catalogs && (
        <div className="grid gap-4 md:grid-cols-2">
          {isSuperAdmin && (
            <form
              onSubmit={(e) => void handleCreateDepartment(e)}
              className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <h2 className="text-sm font-semibold text-slate-200">Nuevo departamento</h2>
              <input
                required
                placeholder="Código (ej. DIAN)"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Nombre del comando"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-lg bg-cyan-700 px-3 py-2 text-sm text-white">
                Crear departamento
              </button>
            </form>
          )}
          <form
            onSubmit={(e) => void handleCreateSquad(e)}
            className={`space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 ${isSuperAdmin ? '' : 'md:col-span-2'}`}
          >
            <h2 className="text-sm font-semibold text-slate-200">Nueva escuadra</h2>
            <select
              required
              value={squadDeptId}
              disabled={!isSuperAdmin && catalogs.departments.length <= 1}
              onChange={(e) => setSquadDeptId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Departamento</option>
              {catalogs.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Nombre escuadra"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              placeholder="Indicativo (callsign)"
              value={squadCallsign}
              onChange={(e) => setSquadCallsign(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-cyan-700 px-3 py-2 text-sm text-white">
              Crear escuadra
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('search')}
          className={`rounded-lg px-4 py-2 text-sm ${mode === 'search' ? 'bg-cyan-900/40 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}
        >
          Buscar funcionarios
        </button>
        {canManage && isSuperAdmin && (
          <button
            type="button"
            onClick={() => {
              setMode('create-profile');
              setSelected(null);
              setProfileForm(EMPTY_PROFILE);
              setProfilePhoto(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm ${mode === 'create-profile' ? 'bg-cyan-900/40 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}
          >
            Nuevo perfil de funcionario
          </button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="space-y-4">
          {mode === 'search' && (
            <>
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por cédula, nombre o credencial"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => void runSearch(query)}
                  className="rounded-lg bg-cyan-700 px-4 py-2 text-sm text-white"
                >
                  Buscar
                </button>
              </div>
              <div className="space-y-2">
                {officers.map((officer) => (
                  <button
                    key={officer.id}
                    type="button"
                    onClick={() => selectOfficer(officer)}
                    className={`w-full rounded-xl border px-4 py-3 text-left ${selected?.id === officer.id ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-slate-800 bg-slate-900/40'}`}
                  >
                    <div className="flex items-center gap-3">
                      <OfficerAvatar
                        photoUrl={officer.profilePhotoUrl}
                        name={`${officer.apellidos} ${officer.nombres}`}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-100">
                          {officer.apellidos}, {officer.nombres}
                        </p>
                        <p className="text-xs text-slate-400">
                          Credencial {officer.credentialNumber} · {officer.assignmentLabel}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          C.I. {officer.cedula} ·{' '}
                          {officer.hasCredentials ? 'Usuario activo' : 'Sin usuario activo'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                {!loading && officers.length === 0 && (
                  <p className="text-sm text-slate-500">Sin resultados</p>
                )}
              </div>
            </>
          )}

          {mode === 'create-profile' && canManage && isSuperAdmin && (
            <form
              onSubmit={(e) => void handleCreateProfile(e)}
              className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5"
            >
              <h2 className="text-sm font-semibold text-slate-200">
                Paso 1 — Perfil del funcionario
              </h2>
              <p className="text-xs text-slate-500">
                Solo datos personales y foto carnet. La asignación a comando y la activación del
                usuario se realizan después.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  placeholder="Cédula"
                  value={profileForm.cedula}
                  onChange={(e) => setProfileForm({ ...profileForm, cedula: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  required
                  placeholder="Apellidos"
                  value={profileForm.apellidos}
                  onChange={(e) => setProfileForm({ ...profileForm, apellidos: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  required
                  placeholder="Nombres"
                  value={profileForm.nombres}
                  onChange={(e) => setProfileForm({ ...profileForm, nombres: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Grado"
                  value={profileForm.grado}
                  onChange={(e) => setProfileForm({ ...profileForm, grado: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Teléfono"
                  value={profileForm.telefono}
                  onChange={(e) => setProfileForm({ ...profileForm, telefono: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={profileForm.fechaNacimiento}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, fechaNacimiento: e.target.value })
                  }
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={profileForm.fechaIngreso}
                  onChange={(e) => setProfileForm({ ...profileForm, fechaIngreso: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Dirección"
                  value={profileForm.direccion}
                  onChange={(e) => setProfileForm({ ...profileForm, direccion: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2"
                />
                <label className="sm:col-span-2 space-y-1 text-sm text-slate-300">
                  <span>Foto tipo carnet</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setProfilePhoto(e.target.files?.[0] ?? null)}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-cyan-900/50 file:px-3 file:py-2 file:text-cyan-200"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white"
              >
                Crear perfil
              </button>
            </form>
          )}
        </section>

        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          {!selected ? (
            <p className="text-sm text-slate-500">
              Seleccione un funcionario para asignar comando, activar usuario o gestionar permisos.
            </p>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <OfficerAvatar
                  photoUrl={selected.profilePhotoUrl}
                  name={`${selected.apellidos} ${selected.nombres}`}
                />
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">
                    {selected.apellidos}, {selected.nombres}
                  </h2>
                  <p className="text-xs text-slate-400">C.I. {selected.cedula}</p>
                  <p className="text-xs text-slate-500">
                    Credencial {selected.credentialNumber}
                  </p>
                  <p className="text-xs text-cyan-400/80">{selected.assignmentLabel}</p>
                </div>
              </div>

              {canManage && catalogs && needsAssignment && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Paso 2 — Asignar a comando
                  </h3>
                  <select
                    value={assignDeptId}
                    onChange={(e) => {
                      setAssignDeptId(e.target.value);
                      setAssignSquadId('');
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  >
                    <option value="">Comando / división</option>
                    {operationalDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={assignSquadId}
                    onChange={(e) => setAssignSquadId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  >
                    <option value="">Sin escuadra</option>
                    {assignSquads.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={assignDivisionRole}
                    onChange={(e) =>
                      setAssignDivisionRole(e.target.value as DivisionRoleValue)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  >
                    {DIVISION_ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    El director de división tendrá acceso a logística, RRHH y parque de armas solo
                    de su comando.
                  </p>
                  <button
                    type="button"
                    disabled={loading || !assignDeptId}
                    onClick={() => void handleAssignToCommand()}
                    className="w-full rounded-lg bg-amber-800 px-3 py-2 text-sm text-white"
                  >
                    Asignar a comando
                  </button>
                </div>
              )}

              {canManage && catalogs && needsActivation && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Paso 3 — Activar usuario
                  </h3>
                  <p className="text-xs text-slate-500">
                    Usuario de login: <strong className="text-slate-300">{selected.cedula}</strong>
                  </p>
                  <input
                    type="password"
                    minLength={8}
                    placeholder="Contraseña (mín. 8)"
                    value={activatePassword}
                    onChange={(e) => setActivatePassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    Permisos opcionales (si no selecciona, se aplican los del perfil institucional).
                  </p>
                  <PermissionGrid
                    catalog={catalogs.permissionCatalog}
                    selected={activatePermissions}
                    onToggle={(p) => togglePermission(p, 'activate')}
                  />
                  <button
                    type="button"
                    disabled={loading || activatePassword.length < 8}
                    onClick={() => void handleActivateAccount()}
                    className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white"
                  >
                    Activar usuario
                  </button>
                </div>
              )}

              {canCredentials && selected.hasCredentials && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Clave de acceso
                  </h3>
                  <input
                    type="password"
                    minLength={8}
                    placeholder="Nueva contraseña (mín. 8)"
                    value={credentialPassword}
                    onChange={(e) => setCredentialPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={loading || credentialPassword.length < 8}
                    onClick={() => void handleSetCredentials()}
                    className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white"
                  >
                    Actualizar clave
                  </button>
                </div>
              )}

              {canManage && catalogs && selected.hasCredentials && !needsAssignment && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {isSuperAdmin ? 'Transferencia de comando' : 'Asignación a escuadra'}
                  </h3>
                  {isSuperAdmin && (
                    <select
                      value={transferDeptId}
                      onChange={(e) => setTransferDeptId(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    >
                      {catalogs.departments
                        .filter((d) => d.code !== 'DECT')
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  )}
                  <select
                    value={transferSquadId}
                    onChange={(e) => setTransferSquadId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  >
                    <option value="">Sin escuadra</option>
                    {transferSquads.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={
                      loading ||
                      (transferDeptId === selected.departmentId &&
                        (transferSquadId || '') === (selected.squadId ?? ''))
                    }
                    onClick={() => void handleTransfer()}
                    className="w-full rounded-lg bg-amber-800 px-3 py-2 text-sm text-white"
                  >
                    {isSuperAdmin ? 'Transferir funcionario' : 'Asignar escuadra'}
                  </button>
                </div>
              )}

              {canManage && catalogs && selected.hasCredentials && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Permisos del módulo
                  </h3>
                  <PermissionGrid
                    catalog={catalogs.permissionCatalog}
                    selected={selectedPermissions}
                    onToggle={(p) => togglePermission(p, 'selected')}
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleSavePermissions()}
                    className="w-full rounded-lg bg-cyan-700 px-3 py-2 text-sm text-white"
                  >
                    Guardar permisos
                  </button>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function PermissionGrid({
  catalog,
  selected,
  onToggle,
}: {
  catalog: SitopPermission[];
  selected: SitopPermission[];
  onToggle: (p: SitopPermission) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {catalog.map((permission) => (
        <label
          key={permission}
          className="flex items-start gap-2 rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-300"
        >
          <input
            type="checkbox"
            checked={selected.includes(permission)}
            onChange={() => onToggle(permission)}
            className="mt-0.5"
          />
          <span>{PERMISSION_LABELS[permission]}</span>
        </label>
      ))}
    </div>
  );
}
