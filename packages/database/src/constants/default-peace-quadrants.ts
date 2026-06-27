export interface DefaultPeaceQuadrantSeed {
  code: string;
  name: string;
  parroquia: string;
  centerLat: number;
  centerLng: number;
  boundaryPolygon: [number, number][];
}

const CUADRANTE_CENTERS: Record<string, [number, number]> = {
  'Cuadrante de Paz 01': [10.565, -71.645],
  'Cuadrante de Paz 02': [10.562, -71.628],
  'Cuadrante de Paz 03': [10.554, -71.642],
  'Cuadrante de Paz 04': [10.551, -71.621],
  'Cuadrante de Paz 05': [10.548, -71.635],
  'Cuadrante de Paz 06': [10.561, -71.618],
  'Cuadrante de Paz 07': [10.543, -71.648],
  'Cuadrante de Paz 08': [10.568, -71.632],
};

const DEFAULT_PARROQUIAS = [
  'San Francisco',
  'El Bajo',
  'La Paz',
  'Jesús María Semprún',
  'San Francisco',
  'El Bajo',
  'La Paz',
  'Jesús María Semprún',
] as const;

function perimeterAround(
  center: [number, number],
  halfLat = 0.0045,
  halfLng = 0.0055,
): [number, number][] {
  const [lat, lng] = center;
  return [
    [lat + halfLat, lng - halfLng],
    [lat + halfLat * 0.35, lng + halfLng],
    [lat - halfLat, lng + halfLng * 0.6],
    [lat - halfLat * 0.85, lng - halfLng * 0.4],
  ];
}

function quadrantCode(name: string): string {
  const match = name.match(/(\d+)/);
  const num = match ? match[1].padStart(2, '0') : '00';
  return `CP-${num}`;
}

/** Los 8 cuadrantes de paz del municipio San Francisco (Zulia) */
export const DEFAULT_PEACE_QUADRANT_NAMES = Object.keys(CUADRANTE_CENTERS);

export const DEFAULT_PEACE_QUADRANTS: DefaultPeaceQuadrantSeed[] = Object.entries(
  CUADRANTE_CENTERS,
).map(([name, center], index) => ({
  code: quadrantCode(name),
  name,
  parroquia: DEFAULT_PARROQUIAS[index] ?? 'San Francisco',
  centerLat: center[0],
  centerLng: center[1],
  boundaryPolygon: perimeterAround(center),
}));

export function quadrantCodeFromName(name: string): string {
  return quadrantCode(name);
}
