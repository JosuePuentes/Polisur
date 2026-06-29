'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  DARK_MATTER_ATTRIBUTION,
  DARK_MATTER_TILE_URL,
  DEFAULT_MAP_ZOOM,
  SAN_FRANCISCO_CENTER,
  VENEZUELA_CENTER,
  VENEZUELA_ZOOM,
} from '@/lib/constants/cuadrantes';

export interface MobilePatrolUnit {
  officerId: string;
  nombres: string;
  apellidos: string;
  credentialNumber: string;
  grado: string | null;
  latitude: number;
  longitude: number;
  cuadrante: string | null;
  procedureCode: string | null;
  squadName: string | null;
  isSelf: boolean;
}

interface MobilePatrolMapProps {
  units: MobilePatrolUnit[];
  selfPosition: { lat: number; lng: number } | null;
  activated: boolean;
}

const selfPatrolIcon = L.divIcon({
  className: 'mobile-self-patrol-marker',
  html: '<div style="width:22px;height:22px;border-radius:4px;background:linear-gradient(135deg,#2563eb 50%,#dc2626 50%);border:2px solid #fff;box-shadow:0 0 10px rgba(37,99,235,.9);transform:rotate(45deg)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const patrolIcon = L.divIcon({
  className: 'mobile-patrol-marker',
  html: '<div style="width:18px;height:18px;border-radius:3px;background:linear-gradient(135deg,#1d4ed8 50%,#b91c1c 50%);border:2px solid #fff;box-shadow:0 0 8px rgba(220,38,38,.8);transform:rotate(45deg)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function fixLeafletDefaultIcons(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

function MapViewport({
  selfPosition,
  activated,
}: {
  selfPosition: { lat: number; lng: number } | null;
  activated: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (activated && selfPosition) {
      map.flyTo([selfPosition.lat, selfPosition.lng], DEFAULT_MAP_ZOOM, { duration: 1.2 });
      return;
    }
    map.setView([VENEZUELA_CENTER.lat, VENEZUELA_CENTER.lng], VENEZUELA_ZOOM);
  }, [activated, selfPosition, map]);

  return null;
}

export function MobilePatrolMap({ units, selfPosition, activated }: MobilePatrolMapProps) {
  useEffect(() => {
    fixLeafletDefaultIcons();
  }, []);

  const center = activated && selfPosition
    ? [selfPosition.lat, selfPosition.lng] as [number, number]
    : [VENEZUELA_CENTER.lat, VENEZUELA_CENTER.lng] as [number, number];

  const zoom = activated && selfPosition ? DEFAULT_MAP_ZOOM : VENEZUELA_ZOOM;

  const remoteUnits = units.filter((unit) => !unit.isSelf);

  return (
    <div className="relative h-[calc(100dvh-8rem)] w-full overflow-hidden rounded-2xl border border-slate-800">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={DARK_MATTER_TILE_URL} attribution={DARK_MATTER_ATTRIBUTION} />
        <MapViewport selfPosition={selfPosition} activated={activated} />

        {selfPosition && (
          <Marker position={[selfPosition.lat, selfPosition.lng]} icon={selfPatrolIcon}>
            <Popup>
              <p className="text-xs font-semibold">Mi patrulla</p>
              <p className="text-[10px] text-slate-500">Ubicación en tiempo real</p>
            </Popup>
          </Marker>
        )}

        {remoteUnits.map((unit) => (
          <Marker
            key={unit.officerId}
            position={[unit.latitude, unit.longitude]}
            icon={patrolIcon}
          >
            <Popup>
              <p className="text-xs font-semibold">
                {unit.grado ? `${unit.grado} ` : ''}
                {unit.nombres} {unit.apellidos}
              </p>
              <p className="text-[10px] text-slate-500">Cred. {unit.credentialNumber}</p>
              {unit.procedureCode && (
                <p className="text-[10px] text-cyan-600">{unit.procedureCode}</p>
              )}
              {unit.cuadrante && (
                <p className="text-[10px] text-slate-500">{unit.cuadrante}</p>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-[10px] text-slate-400">
        <span className="mr-2 inline-block h-2 w-2 rounded-sm bg-gradient-to-br from-blue-600 to-red-600" />
        Patrulla activa
        {!selfPosition && (
          <span className="mt-1 block text-amber-400">Active su ubicación GPS</span>
        )}
      </div>
    </div>
  );
}
