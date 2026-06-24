import {
  CUADRANTE_COORDINATES,
  DEFAULT_CUADRANTE,
} from '../constants/cuadrante-coordinates.constants';

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function resolveCuadranteByCoordinates(
  latitude: number,
  longitude: number,
): string {
  let nearest = DEFAULT_CUADRANTE;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const [name, coords] of Object.entries(CUADRANTE_COORDINATES)) {
    const distance = haversineKm(
      latitude,
      longitude,
      coords.lat,
      coords.lng,
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = name;
    }
  }

  return nearest;
}

export function resolveCuadranteBySector(sector: string): string {
  const normalized = sector.trim().toLowerCase();

  if (!normalized) {
    return DEFAULT_CUADRANTE;
  }

  const directMatch = Object.keys(CUADRANTE_COORDINATES).find(
    (name) => name.toLowerCase() === normalized,
  );

  if (directMatch) {
    return directMatch;
  }

  const digitMatch = normalized.match(/(\d{1,2})/);

  if (digitMatch) {
    const padded = digitMatch[1].padStart(2, '0');
    const candidate = `Cuadrante de Paz ${padded}`;

    if (CUADRANTE_COORDINATES[candidate]) {
      return candidate;
    }
  }

  const fuzzyMatch = Object.keys(CUADRANTE_COORDINATES).find((name) =>
    normalized.includes(name.toLowerCase()),
  );

  return fuzzyMatch ?? DEFAULT_CUADRANTE;
}
