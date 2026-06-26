import { CUADRANTE_COORDINATES } from '@/lib/constants/cuadrantes';

export interface PeaceQuadrantZone {
  id: string;
  number: number;
  label: string;
  assignedUnit: string;
  /** Vértices [lat, lng] en sentido horario */
  polygon: [number, number][];
}

const ASSIGNED_UNITS: Record<string, string> = {
  'Cuadrante de Paz 01': 'Patrulla Alpha · Motorizada',
  'Cuadrante de Paz 02': 'Patrulla Bravo · A pie',
  'Cuadrante de Paz 03': 'Patrulla Charlie · K9',
  'Cuadrante de Paz 04': 'Patrulla Delta · Inteligencia',
  'Cuadrante de Paz 05': 'Patrulla Echo · Motorizada',
  'Cuadrante de Paz 06': 'Patrulla Foxtrot · A pie',
  'Cuadrante de Paz 07': 'Patrulla Golf · Reserva',
  'Cuadrante de Paz 08': 'Patrulla Hotel · Intervención',
};

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

function parseQuadrantNumber(label: string): number {
  const match = label.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/** Polígonos perimetrales aproximados — mock operativo San Francisco */
export const PEACE_QUADRANT_ZONES: PeaceQuadrantZone[] = Object.entries(
  CUADRANTE_COORDINATES,
).map(([label, center]) => {
  const number = parseQuadrantNumber(label);
  return {
    id: `cuadrante-${number}`,
    number,
    label,
    assignedUnit: ASSIGNED_UNITS[label] ?? `Patrulla ${number}`,
    polygon: perimeterAround(center),
  };
});
