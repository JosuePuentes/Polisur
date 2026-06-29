/** Centro geográfico: Municipio San Francisco, Estado Zulia, Venezuela */
export const SAN_FRANCISCO_CENTER = {
  lat: 10.545,
  lng: -71.665,
} as const;

/** Vista nacional para patrullaje móvil */
export const VENEZUELA_CENTER = {
  lat: 7.5,
  lng: -66.0,
} as const;

export const VENEZUELA_ZOOM = 6;

export const DEFAULT_MAP_ZOOM = 13;

/** Coordenadas centrales de los cuadrantes oficiales C-xxx */
export const CUADRANTE_COORDINATES: Record<string, [number, number]> = {
  'Cuadrante de Paz 01': [10.563, -71.639],
  'Cuadrante de Paz 05': [10.548, -71.635],
  'Cuadrante de Paz 12 · Despertar de un Pueblo': [10.533, -71.667],
  'Cuadrante de Paz 12 · Los Sueños del Gigante': [10.551, -71.666],
  'Cuadrante de Paz 13': [10.553, -71.673],
  'Cuadrante de Paz 14': [10.54, -71.68],
  'Cuadrante de Paz 15': [10.52, -71.683],
  'Cuadrante de Paz 16': [10.523, -71.698],
  'Cuadrante de Paz 18': [10.577, -71.658],
};

export const DARK_MATTER_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export const DARK_MATTER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
