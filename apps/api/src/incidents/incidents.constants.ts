import { Prisma } from '@polisur/database';

export const INCIDENT_LIST_INCLUDE = {
  department: {
    select: { id: true, code: true, name: true },
  },
  squad: {
    select: {
      id: true,
      name: true,
      callsign: true,
      leader: {
        select: {
          id: true,
          cedula: true,
          nombres: true,
          apellidos: true,
          rangeRole: true,
        },
      },
      members: {
        select: {
          id: true,
          cedula: true,
          nombres: true,
          apellidos: true,
          rangeRole: true,
        },
        orderBy: { apellidos: 'asc' as const },
      },
    },
  },
  evidence: {
    select: {
      id: true,
      imageUrl: true,
      stage: true,
      descripcion: true,
      capturedAt: true,
    },
    orderBy: { capturedAt: 'asc' as const },
  },
} satisfies Prisma.IncidentInclude;

export const INCIDENT_DETAIL_INCLUDE = {
  ...INCIDENT_LIST_INCLUDE,
} satisfies Prisma.IncidentInclude;
