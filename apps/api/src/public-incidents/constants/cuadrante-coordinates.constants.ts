/** Cuadrantes de Paz — Municipio San Francisco, Zulia (WGS84) */
export const CUADRANTE_COORDINATES: Record<string, { lat: number; lng: number }> =
  {
    'Cuadrante de Paz 01': { lat: 10.565, lng: -71.645 },
    'Cuadrante de Paz 02': { lat: 10.562, lng: -71.628 },
    'Cuadrante de Paz 03': { lat: 10.554, lng: -71.642 },
    'Cuadrante de Paz 04': { lat: 10.551, lng: -71.621 },
    'Cuadrante de Paz 05': { lat: 10.548, lng: -71.635 },
    'Cuadrante de Paz 06': { lat: 10.561, lng: -71.618 },
    'Cuadrante de Paz 07': { lat: 10.543, lng: -71.648 },
    'Cuadrante de Paz 08': { lat: 10.568, lng: -71.632 },
  };

export const DEFAULT_CUADRANTE = 'Cuadrante de Paz 04';

export const PANIC_CRIME_TYPE = 'ALERTA_BOTON_PANICO';

export const PUBLIC_DISPATCH_DEPARTMENT_CODE =
  process.env.PUBLIC_DISPATCH_DEPARTMENT_CODE ?? 'DIAN';

export const MAX_PUBLIC_EVIDENCE_FILES = 3;
