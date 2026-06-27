'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  DARK_MATTER_ATTRIBUTION,
  DARK_MATTER_TILE_URL,
  DEFAULT_MAP_ZOOM,
  SAN_FRANCISCO_CENTER,
} from '@/lib/constants/cuadrantes';
import { PEACE_QUADRANT_ZONES } from '@/lib/constants/peace-quadrants-geo';
import {
  resolveCuadranteCenter,
  resolvePatrolOrigin,
} from '@/lib/utils/map-coordinates';

export interface PatrolMapRecord {
  id: string;
  code: string;
  patrolType: string;
  cuadrante: string;
  descripcion: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface PatrolMapProps {
  patrols: PatrolMapRecord[];
  selectedCuadrante: string;
  draftOrigin?: { lat: number; lng: number } | null;
  highlightedPatrolId?: string | null;
  onSelectCuadrante?: (cuadrante: string) => void;
}

const BASE_ZONE_STYLE = {
  color: '#10b981',
  weight: 2,
  opacity: 0.65,
  fillColor: '#22d3ee',
  fillOpacity: 0.1,
  dashArray: '6 4',
} as const;

const ACTIVE_ZONE_STYLE = {
  color: '#f59e0b',
  weight: 3,
  opacity: 0.95,
  fillColor: '#fbbf24',
  fillOpacity: 0.28,
  dashArray: undefined,
} as const;

const originIcon = L.divIcon({
  className: 'patrol-origin-marker',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#38bdf8;border:2px solid #fff;box-shadow:0 0 8px rgba(56,189,248,.9)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const draftOriginIcon = L.divIcon({
  className: 'patrol-draft-origin-marker',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#22d3ee;border:3px solid #fff;box-shadow:0 0 12px rgba(34,211,238,1)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

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

function matchesCuadrante(zoneLabel: string, selected: string): boolean {
  if (!selected) return false;
  if (zoneLabel === selected) return true;
  const zoneNum = zoneLabel.match(/(\d+)/)?.[1];
  const selNum = selected.match(/(\d+)/)?.[1];
  return Boolean(zoneNum && selNum && zoneNum === selNum);
}

export function PatrolMap({
  patrols,
  selectedCuadrante,
  draftOrigin,
  highlightedPatrolId,
  onSelectCuadrante,
}: PatrolMapProps) {
  useEffect(() => {
    fixLeafletDefaultIcons();
  }, []);

  const patrolLayers = useMemo(
    () =>
      patrols.map((patrol, index) => {
        const origin = resolvePatrolOrigin(patrol, index);
        const destination = resolveCuadranteCenter(patrol.cuadrante);
        return { patrol, origin, destination };
      }),
    [patrols],
  );

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      <header className="border-b border-slate-800 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Mapa operativo · Cuadrantes de Paz
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Destino de minuta (zona resaltada) · origen GPS (punto azul) · ruta
          punteada
        </p>
      </header>

      <div className="relative h-[420px] w-full">
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

          {PEACE_QUADRANT_ZONES.map((zone) => {
            const isSelected = matchesCuadrante(zone.label, selectedCuadrante);
            const isHighlighted = patrolLayers.some(
              ({ patrol }) =>
                patrol.id === highlightedPatrolId &&
                matchesCuadrante(zone.label, patrol.cuadrante),
            );

            return (
              <Polygon
                key={zone.id}
                positions={zone.polygon}
                pathOptions={
                  isSelected || isHighlighted ? ACTIVE_ZONE_STYLE : BASE_ZONE_STYLE
                }
                eventHandlers={
                  onSelectCuadrante
                    ? {
                        click: () => onSelectCuadrante(zone.label),
                      }
                    : undefined
                }
              >
                <Popup className="tactical-popup" closeButton>
                  <div className="min-w-[180px] space-y-1 rounded-lg border border-emerald-500/30 bg-slate-900 p-3 text-slate-100">
                    <p className="text-sm font-semibold">{zone.label}</p>
                    <p className="text-xs text-slate-400">{zone.assignedUnit}</p>
                    {onSelectCuadrante && (
                      <button
                        type="button"
                        className="mt-2 text-xs text-cyan-300 underline"
                        onClick={() => onSelectCuadrante(zone.label)}
                      >
                        Usar como destino de minuta
                      </button>
                    )}
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {patrolLayers.map(({ patrol, origin, destination }) => (
            <Polyline
              key={`route-${patrol.id}`}
              positions={[origin, destination]}
              pathOptions={{
                color:
                  patrol.id === highlightedPatrolId ? '#fbbf24' : '#38bdf8',
                weight: patrol.id === highlightedPatrolId ? 4 : 2,
                opacity: 0.85,
                dashArray: '8 6',
              }}
            />
          ))}

          {patrolLayers.map(({ patrol, origin }) => (
            <Marker key={`origin-${patrol.id}`} position={origin} icon={originIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-mono text-cyan-600">{patrol.code}</p>
                  <p className="text-slate-700">{patrol.patrolType}</p>
                  <p className="text-xs text-slate-500">
                    Origen → {patrol.cuadrante}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {draftOrigin && (
            <Marker
              position={[draftOrigin.lat, draftOrigin.lng]}
              icon={draftOriginIcon}
            >
              <Popup>
                <p className="text-sm text-slate-700">Ubicación actual (minuta en curso)</p>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </section>
  );
}
