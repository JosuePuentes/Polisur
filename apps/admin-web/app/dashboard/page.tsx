'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { fetchIncidents } from '@/lib/api/incidents';
import { getSession } from '@/lib/auth';
import type { TacticalSocketIncident } from '@/lib/constants/tactical-socket';
import { useTacticalSocket } from '@/lib/hooks/use-tactical-socket';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';
import type { Incident } from '@/lib/types/incident.types';
import {
  incidentToSocketPayload,
  upsertIncident,
  upsertIncidentFromSocket,
} from '@/lib/utils/socket-incident-mapper';
import { CreateIncidentPanel } from '@/components/dashboard/create-incident-panel';
import { ExecutiveSummary } from '@/components/dashboard/executive-summary';
import { IncidentList } from '@/components/dashboard/incident-list';
import { IncidentModal } from '@/components/dashboard/incident-modal';
import { TacticalAlertBanner } from '@/components/dashboard/tactical-alert-banner';

const TacticalMap = dynamic(
  () =>
    import('@/components/dashboard/tactical-map').then((mod) => mod.TacticalMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
          Inicializando mapa táctico…
        </p>
      </div>
    ),
  },
);

export default function DashboardPage() {
  const session = getSession();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [originFilter, setOriginFilter] = useState('ALL');
  const [liveAlert, setLiveAlert] = useState<TacticalSocketIncident | null>(
    null,
  );

  const loadIncidents = useCallback(async () => {
    setListLoading(true);
    setListError(null);

    try {
      const data = await fetchIncidents();
      setIncidents(data);
    } catch {
      setListError('No fue posible cargar el registro de incidentes');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents, refreshKey]);

  const injectLiveIncident = useCallback((payload: TacticalSocketIncident) => {
    setLiveAlert(payload);
    setIncidents((prev) => upsertIncidentFromSocket(prev, payload));
  }, []);

  useTacticalSocket({
    enabled: Boolean(session),
    onIncidentCreated: injectLiveIncident,
    onPanicAlert: injectLiveIncident,
  });

  const handleEvidenceUploaded = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setSelectedIncident(null);
  }, []);

  const handleViewExpediente = useCallback((incident: Incident) => {
    setSelectedIncident(incident);
  }, []);

  const handleRadioDispatched = useCallback((incident: Incident) => {
    setLiveAlert(incidentToSocketPayload(incident));
    setIncidents((prev) => upsertIncident(prev, incident));
  }, []);

  if (!session) {
    return null;
  }

  const canViewIncidents = hasPermission(session.permissions, SITOP_PERMISSIONS.INCIDENTS_VIEW);
  const canCreateIncidents = hasPermission(session.permissions, SITOP_PERMISSIONS.INCIDENTS_CREATE);

  return (
    <div className="space-y-6">
      <TacticalAlertBanner
        alert={liveAlert}
        onDismiss={() => setLiveAlert(null)}
      />

      {canCreateIncidents && (
        <CreateIncidentPanel onCreated={() => setRefreshKey((k) => k + 1)} />
      )}

      {canViewIncidents && (
        <>
      <ExecutiveSummary
        incidents={incidents}
        session={session}
        loading={listLoading}
      />

      <TacticalMap
        incidents={incidents}
        loading={listLoading && incidents.length === 0}
        onViewExpediente={handleViewExpediente}
        canRadioDispatch={canCreateIncidents}
        onRadioDispatched={handleRadioDispatched}
      />

      <div className="flex flex-wrap gap-2">
        {['ALL', 'INTERNO', 'PUBLICO_ANONIMO', 'PUBLICO_PANICO'].map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setOriginFilter(filter)}
            className={`rounded-lg px-3 py-1.5 text-xs ${originFilter === filter ? 'bg-cyan-900/40 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}
          >
            {filter === 'ALL' ? 'Todos' : filter.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <IncidentList
        incidents={incidents}
        loading={listLoading}
        error={listError}
        originFilter={originFilter}
        onSelect={setSelectedIncident}
        onRetry={() => void loadIncidents()}
      />

      <IncidentModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onEvidenceUploaded={handleEvidenceUploaded}
      />
        </>
      )}
    </div>
  );
}
