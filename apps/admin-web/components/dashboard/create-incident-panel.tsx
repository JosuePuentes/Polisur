'use client';

import { useEffect, useMemo, useState } from 'react';
import { createIncident, fetchIncidentCatalogs } from '@/lib/api/incidents';
import { PARROQUIAS_SAN_FRANCISCO, SECTORES_REFERENCIA } from '@/lib/constants/public-portal';
import { VEHICLE_TYPES } from '@/lib/constants/vehicles';
import type { IncidentCatalogs } from '@/lib/api/incidents';

const DELITOS = [
  'Tenencia para el consumo',
  'Tráfico Ilícito de Sustancias',
  'Robo',
  'Hurto',
  'Minuta de patrullaje',
  'Alteración del orden público',
];

interface CreateIncidentPanelProps {
  onCreated: () => void;
}

export function CreateIncidentPanel({ onCreated }: CreateIncidentPanelProps) {
  const [catalogs, setCatalogs] = useState<IncidentCatalogs | null>(null);
  const [tipoDelito, setTipoDelito] = useState<string>(DELITOS[0]);
  const [parroquia, setParroquia] = useState<string>(PARROQUIAS_SAN_FRANCISCO[0]);
  const [cuadrante, setCuadrante] = useState<string>(SECTORES_REFERENCIA[0]);
  const [descripcion, setDescripcion] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [squadId, setSquadId] = useState('');
  const [subjectCedula, setSubjectCedula] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('AUTO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const squads = useMemo(
    () => catalogs?.departments.find((d) => d.id === departmentId)?.squads ?? [],
    [catalogs, departmentId],
  );

  useEffect(() => {
    void fetchIncidentCatalogs()
      .then((data) => {
        setCatalogs(data);
        if (data.departments[0]) {
          setDepartmentId(data.departments[0].id);
          setSquadId(data.departments[0].squads[0]?.id ?? '');
        }
      })
      .catch(() => setError('No se pudieron cargar departamentos'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!departmentId || !squadId || descripcion.trim().length < 10) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const incident = await createIncident({
        tipoDelito,
        parroquia,
        cuadrante,
        descripcion: descripcion.trim(),
        departmentId,
        squadId,
        subjectCedula: subjectCedula.trim() || undefined,
        vehiclePlate: vehiclePlate.trim() || undefined,
        vehicleType: vehiclePlate.trim() ? vehicleType : undefined,
      });
      setSuccess(`Incidente ${incident.code} registrado`);
      setDescripcion('');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el incidente');
    } finally {
      setLoading(false);
    }
  }

  if (!catalogs) return null;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-200">Nueva minuta / patrullaje / incidente</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <select value={tipoDelito} onChange={(e) => setTipoDelito(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
          {DELITOS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select value={parroquia} onChange={(e) => setParroquia(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
          {PARROQUIAS_SAN_FRANCISCO.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={cuadrante} onChange={(e) => setCuadrante(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
          {SECTORES_REFERENCIA.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setSquadId(''); }} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
          {catalogs.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select required value={squadId} onChange={(e) => setSquadId(e.target.value)} className="md:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
          <option value="">Seleccione escuadra</option>
          {squads.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <textarea required minLength={10} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Relato operativo (mín. 10 caracteres)" className="md:col-span-2 min-h-[90px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <input value={subjectCedula} onChange={(e) => setSubjectCedula(e.target.value)} placeholder="Cédula implicado (opcional)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="Placa / matrícula vehículo (opcional)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        {vehiclePlate.trim() && (
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {success && <p className="text-sm text-emerald-300">{success}</p>}
      <button type="submit" disabled={loading} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white">{loading ? 'Registrando…' : 'Registrar incidente'}</button>
    </form>
  );
}
