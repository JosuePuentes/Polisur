/** Centro geográfico: Municipio San Francisco, Estado Zulia, Venezuela */
export const SAN_FRANCISCO_CENTER = {
  lat: 10.5579,
  lng: -71.633,
} as const;

export const DEFAULT_MAP_ZOOM = 14;

/** Coordenadas operativas por Cuadrante de Paz */
export const CUADRANTE_COORDINATES: Record<string, [number, number]> = {
  'Cuadrante de Paz 01': [10.565, -71.645],
  'Cuadrante de Paz 02': [10.562, -71.628],
  'Cuadrante de Paz 03': [10.554, -71.642],
  'Cuadrante de Paz 04': [10.551, -71.621],
  'Cuadrante de Paz 05': [10.548, -71.635],
  'Cuadrante de Paz 06': [10.561, -71.618],
  'Cuadrante de Paz 07': [10.543, -71.648],
  'Cuadrante de Paz 08': [10.568, -71.632],
};

export const DARK_MATTER_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export const DARK_MATTER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
