'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { opsApi } from '@/lib/api/operations';
import {
  DARK_MATTER_ATTRIBUTION,
  DARK_MATTER_TILE_URL,
  DEFAULT_MAP_ZOOM,
  SAN_FRANCISCO_CENTER,
} from '@/lib/constants/cuadrantes';
import { PEACE_QUADRANT_ZONES } from '@/lib/constants/peace-quadrants-geo';
import { resolveIncidentCoordinates } from '@/lib/utils/map-coordinates';
import type { Incident } from '@/lib/types/incident.types';
import { StatusBadge } from './status-badge';
import { RadioDispatchModal } from './radio-dispatch-modal';

interface TacticalMapProps {
  incidents: Incident[];
  loading?: boolean;
  onViewExpediente: (incident: Incident) => void;
  showHeatmapToggle?: boolean;
  canRadioDispatch?: boolean;
  onRadioDispatched?: (incident: Incident) => void;
}

function fixLeafletDefaultIcons(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

const defaultMarkerIcon = L.icon({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const transitPulseIcon = L.divIcon({
  className: 'tactical-marker-transit',
  html: `
    <div class="tactical-marker-transit__core">
      <span class="tactical-marker-transit__ring"></span>
      <span class="tactical-marker-transit__dot"></span>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const QUADRANT_POLYGON_STYLE = {
  color: '#10b981',
  weight: 2,
  opacity: 0.75,
  fillColor: '#22d3ee',
  fillOpacity: 0.12,
  dashArray: '6 4',
} as const;

function MapBounds({ incidents }: { incidents: Incident[] }) {
  const map = useMap();
  const initialFitDone = useRef(false);

  useEffect(() => {
    if (incidents.length === 0) {
      map.setView(
        [SAN_FRANCISCO_CENTER.lat, SAN_FRANCISCO_CENTER.lng],
        DEFAULT_MAP_ZOOM,
      );
      return;
    }

    if (initialFitDone.current) {
      return;
    }

    initialFitDone.current = true;
    const bounds = L.latLngBounds(
      incidents.map((incident, index) =>
        resolveIncidentCoordinates(incident, index),
      ),
    );
    map.fitBounds(bounds.pad(0.25), { maxZoom: 15 });
  }, [incidents, map]);

  return null;
}

export function TacticalMap({
  incidents,
  loading,
  onViewExpediente,
  showHeatmapToggle = true,
  canRadioDispatch = false,
  onRadioDispatched,
}: TacticalMapProps) {
  useEffect(() => {
    fixLeafletDefaultIcons();
  }, []);

  const [radioModalOpen, setRadioModalOpen] = useState(false);

  const [heatmapOn, setHeatmapOn] = useState(false);
  const [heatmap, setHeatmap] = useState<{
    patrols: Array<{ latitude: number | null; longitude: number | null }>;
    incidents: Array<{ latitude: number | null; longitude: number | null }>;
  }>({ patrols: [], incidents: [] });

  useEffect(() => {
    if (!heatmapOn) return;
    void opsApi.heatmap().then((data) => setHeatmap(data as typeof heatmap)).catch(() => setHeatmap({ patrols: [], incidents: [] }));
  }, [heatmapOn]);

  const markers = useMemo(
    () =>
      incidents.map((incident, index) => ({
        incident,
        position: resolveIncidentCoordinates(incident, index),
        icon:
          incident.status === 'EN_TRANSITO'
            ? transitPulseIcon
            : defaultMarkerIcon,
      })),
    [incidents],
  );

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-tactical">
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">
            Mapa Táctico · Cuadrantes de Paz
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            San Francisco, Zulia — despliegue operativo en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          {showHeatmapToggle && (
            <button
              type="button"
              onClick={() => setHeatmapOn((v) => !v)}
              className={`rounded px-2 py-1 ${heatmapOn ? 'bg-orange-900/50 text-orange-300' : 'bg-slate-800 text-slate-400'}`}
            >
              {heatmapOn ? 'Ocultar calor' : 'Mapa de calor'}
            </button>
          )}
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm border border-emerald-500/60 bg-cyan-500/20" />
            Cuadrantes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            En tránsito
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Otros estatus
          </span>
        </div>
      </header>

      <div className="relative h-[400px] w-full">
        {loading && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
            <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
              Sincronizando despliegue…
            </p>
          </div>
        )}

        <MapContainer
          center={[SAN_FRANCISCO_CENTER.lat, SAN_FRANCISCO_CENTER.lng]}
          zoom={DEFAULT_MAP_ZOOM}
          scrollWheelZoom
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution={DARK_MATTER_ATTRIBUTION}
            url={DARK_MATTER_TILE_URL}
          />
          <MapBounds incidents={incidents} />

          {PEACE_QUADRANT_ZONES.map((zone) => (
            <Polygon
              key={zone.id}
              positions={zone.polygon}
              pathOptions={QUADRANT_POLYGON_STYLE}
            >
              <Popup className="tactical-popup" closeButton>
                <div className="min-w-[200px] space-y-2 rounded-lg border border-emerald-500/30 bg-slate-900 p-3 text-slate-100">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/90">
                    Zona de Paz
                  </p>
                  <p className="text-sm font-semibold text-slate-100">
                    Cuadrante de Paz N° {zone.number.toString().padStart(2, '0')}
                  </p>
                  <p className="text-xs text-slate-400">
                    Unidad asignada:{' '}
                    <span className="text-cyan-300">{zone.assignedUnit}</span>
                  </p>
                </div>
              </Popup>
            </Polygon>
          ))}

          {heatmapOn && heatmap.patrols.map((p, i) => (
            p.latitude != null && p.longitude != null ? (
              <CircleMarker
                key={`patrol-${i}`}
                center={[p.latitude, p.longitude]}
                radius={12}
                pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.35, weight: 0 }}
              />
            ) : null
          ))}

          {heatmapOn && heatmap.incidents.map((p, i) => (
            p.latitude != null && p.longitude != null ? (
              <CircleMarker
                key={`heat-inc-${i}`}
                center={[p.latitude, p.longitude]}
                radius={14}
                pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.4, weight: 0 }}
              />
            ) : null
          ))}

          {markers.map(({ incident, position, icon }) => (
            <Marker key={incident.id} position={position} icon={icon}>
              <Popup className="tactical-popup" closeButton>
                <div className="min-w-[220px] space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-3 text-slate-100">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-cyan-500/80">
                      Expediente
                    </p>
                    <p className="font-mono text-sm font-semibold text-cyan-300">
                      {incident.code}
                    </p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p>
                      <span className="text-slate-500">Delito: </span>
                      {incident.tipoDelito}
                    </p>
                    <p>
                      <span className="text-slate-500">Escuadra: </span>
                      {incident.squad.name}
                    </p>
                    <p>
                      <span className="text-slate-500">Cuadrante: </span>
                      {incident.cuadrante}
                    </p>
                  </div>

                  <StatusBadge status={incident.status} />

                  <button
                    type="button"
                    onClick={() => onViewExpediente(incident)}
                    className="w-full rounded-lg border border-cyan-600/40 bg-cyan-950/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-300 transition hover:border-cyan-500/60 hover:bg-cyan-950/60"
                  >
                    Ver Expediente
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <style jsx global>{`
        .leaflet-container {
          background: #020617;
          font-family: inherit;
        }

        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          background: transparent;
          box-shadow: none;
          border: none;
        }

        .leaflet-popup-content {
          margin: 0;
          width: auto !important;
        }

        .leaflet-interactive:focus {
          outline: none;
        }

        .tactical-marker-transit {
          background: transparent;
          border: none;
        }

        .tactical-marker-transit__core {
          position: relative;
          width: 28px;
          height: 28px;
        }

        .tactical-marker-transit__ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: rgba(34, 211, 238, 0.45);
          animation: tactical-ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .tactical-marker-transit__dot {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 12px;
          height: 12px;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          background: #22d3ee;
          box-shadow: 0 0 12px rgba(34, 211, 238, 0.9);
        }

        @keyframes tactical-ping {
          0% {
            transform: scale(0.6);
            opacity: 0.9;
          }
          70% {
            transform: scale(1.8);
            opacity: 0;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
      `}</style>

      {canRadioDispatch && (
        <>
          <button
            type="button"
            onClick={() => setRadioModalOpen(true)}
            className="absolute bottom-5 right-5 z-[500] flex max-w-[220px] items-center gap-2 rounded-full border border-amber-500/50 bg-gradient-to-r from-amber-700 to-amber-600 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-amber-900/40 transition hover:scale-[1.02] hover:from-amber-600 hover:to-amber-500"
          >
            <span aria-hidden className="text-base">📻</span>
            Registrar Incidente Vía Radio / Central
          </button>
          <RadioDispatchModal
            open={radioModalOpen}
            onClose={() => setRadioModalOpen(false)}
            onDispatched={(incident) => {
              onRadioDispatched?.(incident);
              setRadioModalOpen(false);
            }}
          />
        </>
      )}
    </section>
  );
}
