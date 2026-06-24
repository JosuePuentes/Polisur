import type { Incident } from '@/lib/types/incident.types';
import {
  CUADRANTE_COORDINATES,
  SAN_FRANCISCO_CENTER,
} from '@/lib/constants/cuadrantes';

export function resolveIncidentCoordinates(
  incident: Incident,
  index: number,
): [number, number] {
  if (
    typeof incident.latitude === 'number' &&
    typeof incident.longitude === 'number'
  ) {
    const ring = Math.floor(index / 4);
    const slot = index % 4;
    const angle = (slot / 4) * Math.PI * 2;
    const radius = 0.0003 + ring * 0.0002;

    return [
      incident.latitude + Math.cos(angle) * radius,
      incident.longitude + Math.sin(angle) * radius,
    ];
  }

  const base =
    CUADRANTE_COORDINATES[incident.cuadrante] ??
    inferCuadranteCoordinates(incident.cuadrante);

  const ring = Math.floor(index / 4);
  const slot = index % 4;
  const angle = (slot / 4) * Math.PI * 2;
  const radius = 0.0008 + ring * 0.0004;

  return [
    base[0] + Math.cos(angle) * radius,
    base[1] + Math.sin(angle) * radius,
  ];
}

function inferCuadranteCoordinates(cuadrante: string): [number, number] {
  const match = cuadrante.match(/(\d+)/);
  const n = match ? Number.parseInt(match[1], 10) : 0;
  const offsetLat = ((n % 4) - 1.5) * 0.004;
  const offsetLng = (Math.floor(n / 4) - 1) * 0.004;

  return [
    SAN_FRANCISCO_CENTER.lat + offsetLat,
    SAN_FRANCISCO_CENTER.lng + offsetLng,
  ];
}
