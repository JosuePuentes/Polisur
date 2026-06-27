'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  DARK_MATTER_ATTRIBUTION,
  DARK_MATTER_TILE_URL,
  DEFAULT_MAP_ZOOM,
  SAN_FRANCISCO_CENTER,
} from '@/lib/constants/cuadrantes';

export interface PeaceQuadrantMapRecord {
  id: string;
  code: string;
  name: string;
  parroquia: string;
  centerLat: number | null;
  centerLng: number | null;
  boundaryPolygon: [number, number][] | null;
}

const ZONE_COLORS = [
  '#22d3ee',
  '#34d399',
  '#a78bfa',
  '#fbbf24',
  '#fb7185',
  '#60a5fa',
  '#f472b6',
  '#4ade80',
] as const;

const DRAFT_STYLE = {
  color: '#f59e0b',
  weight: 3,
  opacity: 0.95,
  fillColor: '#fbbf24',
  fillOpacity: 0.25,
  dashArray: '8 6',
} as const;

function fixLeafletDefaultIcons(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

function parsePolygon(raw: unknown): [number, number][] | null {
  if (!Array.isArray(raw) || raw.length < 3) return null;
  return raw.map((point) => {
    const [lat, lng] = point as [number, number];
    return [Number(lat), Number(lng)] as [number, number];
  });
}

function MapClickHandler({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      onClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

interface PeaceQuadrantsMapProps {
  quadrants: PeaceQuadrantMapRecord[];
  selectedId?: string | null;
  draftPolygon?: [number, number][];
  drawMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onSelectQuadrant?: (id: string) => void;
}

export function PeaceQuadrantsMap({
  quadrants,
  selectedId,
  draftPolygon = [],
  drawMode = false,
  onMapClick,
  onSelectQuadrant,
}: PeaceQuadrantsMapProps) {
  useEffect(() => {
    fixLeafletDefaultIcons();
  }, []);

  const zones = useMemo(
    () =>
      quadrants.map((quadrant, index) => ({
        quadrant,
        polygon: parsePolygon(quadrant.boundaryPolygon),
        color: ZONE_COLORS[index % ZONE_COLORS.length],
      })),
    [quadrants],
  );

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      <header className="border-b border-slate-800 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-200">Mapa de Cuadrantes de Paz</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Zonas delimitadas y punto central de cada cuadrante ·{' '}
          {drawMode
            ? 'clic en el mapa para marcar vértices de la nueva zona'
            : 'seleccione un cuadrante para ver detalle'}
        </p>
      </header>

      <div className={`relative h-[480px] w-full ${drawMode ? 'cursor-crosshair' : ''}`}>
        <MapContainer
          center={[SAN_FRANCISCO_CENTER.lat, SAN_FRANCISCO_CENTER.lng]}
          zoom={DEFAULT_MAP_ZOOM}
          scrollWheelZoom
          className="h-full w-full z-0"
        >
          <TileLayer attribution={DARK_MATTER_ATTRIBUTION} url={DARK_MATTER_TILE_URL} />

          {zones.map(({ quadrant, polygon, color }) => {
            if (!polygon) return null;
            const isSelected = quadrant.id === selectedId;
            return (
              <Polygon
                key={quadrant.id}
                positions={polygon}
                pathOptions={{
                  color: isSelected ? '#f59e0b' : color,
                  weight: isSelected ? 3 : 2,
                  opacity: 0.9,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.3 : 0.15,
                }}
                eventHandlers={
                  onSelectQuadrant
                    ? { click: () => onSelectQuadrant(quadrant.id) }
                    : undefined
                }
              >
                <Popup>
                  <div className="min-w-[180px] space-y-1 text-slate-800">
                    <p className="font-semibold">{quadrant.name}</p>
                    <p className="text-xs">{quadrant.code} · {quadrant.parroquia}</p>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {zones.map(({ quadrant, color }) => {
            if (quadrant.centerLat == null || quadrant.centerLng == null) return null;
            return (
              <CircleMarker
                key={`center-${quadrant.id}`}
                center={[quadrant.centerLat, quadrant.centerLng]}
                radius={7}
                pathOptions={{
                  color: '#fff',
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <p className="text-sm font-medium text-slate-800">{quadrant.name}</p>
                </Popup>
              </CircleMarker>
            );
          })}

          {draftPolygon.length >= 2 && (
            <Polygon positions={draftPolygon} pathOptions={DRAFT_STYLE} />
          )}

          {draftPolygon.map(([lat, lng], index) => (
            <Marker
              key={`draft-${index}-${lat}-${lng}`}
              position={[lat, lng]}
              icon={L.divIcon({
                className: 'draft-vertex-marker',
                html: `<div style="width:12px;height:12px;border-radius:50%;background:#f59e0b;border:2px solid #fff;box-shadow:0 0 6px rgba(245,158,11,.9)"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6],
              })}
            />
          ))}

          <MapClickHandler enabled={drawMode} onClick={(lat, lng) => onMapClick?.(lat, lng)} />
        </MapContainer>
      </div>
    </section>
  );
}
