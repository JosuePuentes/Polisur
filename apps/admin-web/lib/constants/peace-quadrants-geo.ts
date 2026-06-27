import { CUADRANTE_COORDINATES } from '@/lib/constants/cuadrantes';

export interface PeaceQuadrantZone {
  id: string;
  code: string;
  number: number;
  label: string;
  comuna: string;
  assignedUnit: string;
  polygon: [number, number][];
}

const OFFICIAL_QUADRANTS: Array<{
  code: string;
  number: number;
  label: string;
  comuna: string;
  bounds: [number, number, number, number];
}> = [
  { code: 'C-201', number: 1, label: 'Cuadrante de Paz 01', comuna: 'Socialista Hugo Rafael Chávez Frías', bounds: [10.558, 10.568, -71.648, -71.63] },
  { code: 'C-199', number: 5, label: 'Cuadrante de Paz 05', comuna: 'Gran Cacique Guacaipuro', bounds: [10.542, 10.554, -71.642, -71.628] },
  { code: 'C-195', number: 12, label: 'Cuadrante de Paz 12 · Despertar de un Pueblo', comuna: 'Despertar de un Pueblo', bounds: [10.528, 10.538, -71.676, -71.658] },
  { code: 'C-191', number: 12, label: 'Cuadrante de Paz 12 · Los Sueños del Gigante', comuna: 'Los Sueños del Gigante', bounds: [10.54, 10.562, -71.68, -71.652] },
  { code: 'C-189', number: 13, label: 'Cuadrante de Paz 13', comuna: 'La Fuerza del Pueblo', bounds: [10.55, 10.556, -71.682, -71.664] },
  { code: 'C-187', number: 14, label: 'Cuadrante de Paz 14', comuna: 'Vencedores del Sur', bounds: [10.536, 10.544, -71.688, -71.672] },
  { code: 'C-177', number: 15, label: 'Cuadrante de Paz 15', comuna: 'Socialista Ciudad del Rey', bounds: [10.514, 10.526, -71.692, -71.674] },
  { code: 'C-178', number: 16, label: 'Cuadrante de Paz 16', comuna: 'Lucha Esfuerzo y Victoria', bounds: [10.514, 10.532, -71.712, -71.685] },
  { code: 'C-184', number: 18, label: 'Cuadrante de Paz 18', comuna: 'Salvador Allende', bounds: [10.568, 10.586, -71.667, -71.649] },
];

function boundsPolygon(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
): [number, number][] {
  return [
    [maxLat, minLng],
    [maxLat, maxLng],
    [minLat, maxLng],
    [minLat, minLng],
  ];
}

/** Polígonos oficiales para mapas de patrullaje y centro de mando */
export const PEACE_QUADRANT_ZONES: PeaceQuadrantZone[] = OFFICIAL_QUADRANTS.map((q) => {
  const [minLat, maxLat, minLng, maxLng] = q.bounds;
  const center = CUADRANTE_COORDINATES[q.label];
  return {
    id: q.code,
    code: q.code,
    number: q.number,
    label: q.label,
    comuna: q.comuna,
    assignedUnit: `Cuadrante ${q.code}`,
    polygon: boundsPolygon(minLat, maxLat, minLng, maxLng),
    ...(center ? {} : {}),
  };
});
