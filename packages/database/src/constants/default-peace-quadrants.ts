export interface DefaultPeaceQuadrantSeed {
  code: string;
  quadrantNumber: number;
  name: string;
  parroquia: string;
  comuna: string;
  centerLat: number;
  centerLng: number;
  boundaryPolygon: [number, number][];
}

/** Rectángulo aproximado a partir de los ejes de las fichas oficiales DGCP */
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

function centerOf(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
): [number, number] {
  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
}

function quadrantName(number: number): string {
  return `Cuadrante de Paz ${String(number).padStart(2, '0')}`;
}

/**
 * Catálogo oficial — Policía Municipal San Francisco (Zulia).
 * Polígonos derivados de las fichas 11C-xxx (ejes lat/lng de cada captura).
 */
export const DEFAULT_PEACE_QUADRANTS: DefaultPeaceQuadrantSeed[] = [
  {
    code: 'C-201',
    quadrantNumber: 1,
    name: quadrantName(1),
    parroquia: 'Francisco Ochoa',
    comuna: 'Socialista Hugo Rafael Chávez Frías',
    ...(() => {
      const [lat, lng] = centerOf(10.558, 10.568, -71.648, -71.63);
      return {
        centerLat: lat,
        centerLng: lng,
        boundaryPolygon: boundsPolygon(10.558, 10.568, -71.648, -71.63),
      };
    })(),
  },
  {
    code: 'C-199',
    quadrantNumber: 5,
    name: quadrantName(5),
    parroquia: 'San Francisco',
    comuna: 'Gran Cacique Guacaipuro',
    ...(() => {
      const [lat, lng] = centerOf(10.542, 10.554, -71.642, -71.628);
      return {
        centerLat: lat,
        centerLng: lng,
        boundaryPolygon: boundsPolygon(10.542, 10.554, -71.642, -71.628),
      };
    })(),
  },
  {
    code: 'C-195',
    quadrantNumber: 12,
    name: 'Cuadrante de Paz 12 · Despertar de un Pueblo',
    parroquia: 'Domitila Flores',
    comuna: 'Despertar de un Pueblo',
    ...(() => {
      const [lat, lng] = centerOf(10.528, 10.538, -71.676, -71.658);
      return {
        centerLat: lat,
        centerLng: lng,
        boundaryPolygon: boundsPolygon(10.528, 10.538, -71.676, -71.658),
      };
    })(),
  },
  {
    code: 'C-191',
    quadrantNumber: 12,
    name: 'Cuadrante de Paz 12 · Los Sueños del Gigante',
    parroquia: 'Domitila Flores',
    comuna: 'Los Sueños del Gigante',
    ...(() => {
      const [lat, lng] = centerOf(10.54, 10.562, -71.68, -71.652);
      return {
        centerLat: lat,
        centerLng: lng,
        boundaryPolygon: boundsPolygon(10.54, 10.562, -71.68, -71.652),
      };
    })(),
  },
  {
    code: 'C-189',
    quadrantNumber: 13,
    name: quadrantName(13),
    parroquia: 'Domitila Flores',
    comuna: 'La Fuerza del Pueblo',
    ...(() => {
      const [lat, lng] = centerOf(10.55, 10.556, -71.682, -71.664);
      return {
        centerLat: lat,
        centerLng: lng,
        boundaryPolygon: boundsPolygon(10.55, 10.556, -71.682, -71.664),
      };
    })(),
  },
  {
    code: 'C-187',
    quadrantNumber: 14,
    name: quadrantName(14),
    parroquia: 'José Domingo Rus',
    comuna: 'Vencedores del Sur',
    ...(() => {
      const [lat, lng] = centerOf(10.536, 10.544, -71.688, -71.672);
      return {
        centerLat: lat,
        centerLng: lng,
        boundaryPolygon: boundsPolygon(10.536, 10.544, -71.688, -71.672),
      };
    })(),
  },
  {
    code: 'C-177',
    quadrantNumber: 15,
    name: quadrantName(15),
    parroquia: 'José Domingo Rus',
    comuna: 'Socialista Ciudad del Rey',
    ...(() => {
      const [lat, lng] = centerOf(10.514, 10.526, -71.692, -71.674);
      return {
        centerLat: lat,
        centerLng: lng,
        boundaryPolygon: boundsPolygon(10.514, 10.526, -71.692, -71.674),
      };
    })(),
  },
  {
    code: 'C-178',
    quadrantNumber: 16,
    name: quadrantName(16),
    parroquia: 'Los Cortijos',
    comuna: 'Lucha Esfuerzo y Victoria',
    ...(() => {
      const [lat, lng] = centerOf(10.514, 10.532, -71.712, -71.685);
      return {
        centerLat: lat,
        centerLng: lng,
        boundaryPolygon: boundsPolygon(10.514, 10.532, -71.712, -71.685),
      };
    })(),
  },
  {
    code: 'C-184',
    quadrantNumber: 18,
    name: quadrantName(18),
    parroquia: 'Marcial Hernández',
    comuna: 'Salvador Allende',
    ...(() => {
      const [lat, lng] = centerOf(10.568, 10.586, -71.667, -71.649);
      return {
        centerLat: lat,
        centerLng: lng,
        boundaryPolygon: boundsPolygon(10.568, 10.586, -71.667, -71.649),
      };
    })(),
  },
];

export const DEFAULT_PEACE_QUADRANT_NAMES = DEFAULT_PEACE_QUADRANTS.map((q) => q.name);

export function quadrantCodeFromName(name: string): string {
  const match = name.match(/C-(\d+)/i) ?? name.match(/(\d+)/);
  if (match) {
    const digits = match[1] ?? match[0];
    return `C-${digits.padStart(3, '0')}`;
  }
  return name.slice(0, 12).toUpperCase();
}
