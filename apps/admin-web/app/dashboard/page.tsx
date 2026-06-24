'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { getSession } from '@/lib/auth';
import type { TacticalSocketIncident } from '@/lib/constants/tactical-socket';
import { useTacticalSocket } from '@/lib/hooks/use-tactical-socket';
import type { Incident } from '@/lib/types/incident.types';
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
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [liveAlert, setLiveAlert] = useState<TacticalSocketIncident | null>(
    null,
  );

  const handleSocketEvent = useCallback((payload: TacticalSocketIncident) => {
    setLiveAlert(payload);
    setRefreshKey((key) => key + 1);
  }, []);

  useTacticalSocket({
    enabled: Boolean(session),
    onIncidentCreated: handleSocketEvent,
    onPanicAlert: handleSocketEvent,
  });

  const handleIncidentsChange = useCallback(
    (data: Incident[], loading: boolean) => {
      setIncidents(data);
      setListLoading(loading);
    },
    [],
  );

  const handleEvidenceUploaded = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setSelectedIncident(null);
  }, []);

  const handleViewExpediente = useCallback((incident: Incident) => {
    setSelectedIncident(incident);
  }, []);

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-6">
      <TacticalAlertBanner
        alert={liveAlert}
        onDismiss={() => setLiveAlert(null)}
      />

      <ExecutiveSummary
        incidents={incidents}
        session={session}
        loading={listLoading}
      />

      <TacticalMap
        incidents={incidents}
        loading={listLoading}
        onViewExpediente={handleViewExpediente}
      />

      <IncidentList
        key={refreshKey}
        refreshKey={refreshKey}
        onSelect={setSelectedIncident}
        onIncidentsChange={handleIncidentsChange}
      />

      <IncidentModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onEvidenceUploaded={handleEvidenceUploaded}
      />
    </div>
  );
}
