import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  AssetStatus,
  AssetType,
  DEFAULT_MINUTE_RESEÑA_PREFIX,
  DEMO_CEDULA_PREFIX,
  DEMO_CODE_PREFIX,
  DEMO_DEFAULT_PASSWORD,
  DEMO_DETAINEES,
  DEMO_OFFICERS,
  DetaineeStatus,
  DivisionRole,
  IncidentOrigin,
  IncidentStatus,
  MinuteRole,
  PatrolType,
  PrismaService,
  ProcedureOutcome,
  ProcedureStatus,
  RangeRole,
  ShiftStatus,
  VehicleType,
  WeaponStatus,
  ALL_SITOP_PERMISSIONS,
} from '@polisur/database';
import * as bcrypt from 'bcrypt';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { assertSuperAdmin } from '../common/utils/operational-scope.util';

const BCRYPT_ROUNDS = 12;

function daysAgo(days: number, hour = 10, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function todayDateOnly(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

@Injectable()
export class DemoDataService {
  private readonly logger = new Logger(DemoDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<{
    demoOfficers: number;
    demoPatrols: number;
    demoProcedures: number;
    demoDetainees: number;
    demoIncidents: number;
    hasDemoData: boolean;
  }> {
    const [demoOfficers, demoPatrols, demoProcedures, demoDetainees, demoIncidents] =
      await Promise.all([
        this.prisma.officer.count({
          where: { cedula: { startsWith: DEMO_CEDULA_PREFIX } },
        }),
        this.prisma.patrolMinute.count({
          where: { code: { startsWith: DEMO_CODE_PREFIX } },
        }),
        this.prisma.procedure.count({
          where: { code: { startsWith: DEMO_CODE_PREFIX } },
        }),
        this.prisma.detainee.count({
          where: { cedula: { startsWith: 'V-88002' } },
        }),
        this.prisma.incident.count({
          where: { code: { startsWith: DEMO_CODE_PREFIX } },
        }),
      ]);

    return {
      demoOfficers,
      demoPatrols,
      demoProcedures,
      demoDetainees,
      demoIncidents,
      hasDemoData:
        demoOfficers > 0 ||
        demoPatrols > 0 ||
        demoProcedures > 0 ||
        demoDetainees > 0 ||
        demoIncidents > 0,
    };
  }

  async clearDemoData(actor: AuthenticatedOfficer): Promise<{ removed: Record<string, number> }> {
    assertSuperAdmin(actor);

    const demoOfficerIds = (
      await this.prisma.officer.findMany({
        where: { cedula: { startsWith: DEMO_CEDULA_PREFIX } },
        select: { id: true },
      })
    ).map((row) => row.id);

    const demoPatrolIds = (
      await this.prisma.patrolMinute.findMany({
        where: { code: { startsWith: DEMO_CODE_PREFIX } },
        select: { id: true },
      })
    ).map((row) => row.id);

    const counts = await this.prisma.$transaction(async (tx) => {
      const removed: Record<string, number> = {};

      removed.procedures = (
        await tx.procedure.deleteMany({
          where: { code: { startsWith: DEMO_CODE_PREFIX } },
        })
      ).count;

      if (demoPatrolIds.length) {
        removed.patrolPhotos = (
          await tx.patrolMinutePhoto.deleteMany({
            where: { patrolMinuteId: { in: demoPatrolIds } },
          })
        ).count;
        removed.recoveredObjects = (
          await tx.recoveredObject.deleteMany({
            where: { patrolMinuteId: { in: demoPatrolIds } },
          })
        ).count;
        removed.patrolVehicles = (
          await tx.patrolMinuteVehicle.deleteMany({
            where: { patrolMinuteId: { in: demoPatrolIds } },
          })
        ).count;
        removed.patrolOfficers = (
          await tx.patrolMinuteOfficer.deleteMany({
            where: { patrolMinuteId: { in: demoPatrolIds } },
          })
        ).count;
      }

      removed.patrols = (
        await tx.patrolMinute.deleteMany({
          where: { code: { startsWith: DEMO_CODE_PREFIX } },
        })
      ).count;

      removed.detaineePhotos = (
        await tx.detaineePhoto.deleteMany({
          where: { detainee: { cedula: { startsWith: 'V-88002' } } },
        })
      ).count;
      removed.detaineeHearings = (
        await tx.detaineeHearing.deleteMany({
          where: { detainee: { cedula: { startsWith: 'V-88002' } } },
        })
      ).count;
      removed.detaineeRecords = (
        await tx.detaineeRecord.deleteMany({
          where: { detainee: { cedula: { startsWith: 'V-88002' } } },
        })
      ).count;
      removed.detainees = (
        await tx.detainee.deleteMany({
          where: { cedula: { startsWith: 'V-88002' } },
        })
      ).count;

      removed.incidentEvidence = (
        await tx.incidentEvidence.deleteMany({
          where: { incident: { code: { startsWith: DEMO_CODE_PREFIX } } },
        })
      ).count;
      removed.incidents = (
        await tx.incident.deleteMany({
          where: { code: { startsWith: DEMO_CODE_PREFIX } },
        })
      ).count;

      if (demoOfficerIds.length) {
        removed.shifts = (
          await tx.officerShift.deleteMany({
            where: { officerId: { in: demoOfficerIds } },
          })
        ).count;
      }

      removed.weaponAssignments = (
        await tx.weaponAssignment.deleteMany({
          where: { weapon: { serialNumber: { startsWith: DEMO_CODE_PREFIX } } },
        })
      ).count;
      removed.weapons = (
        await tx.weapon.deleteMany({
          where: { serialNumber: { startsWith: DEMO_CODE_PREFIX } },
        })
      ).count;
      removed.inventory = (
        await tx.inventoryAsset.deleteMany({
          where: { code: { startsWith: DEMO_CODE_PREFIX } },
        })
      ).count;
      removed.controlPoints = (
        await tx.controlPoint.deleteMany({
          where: { name: { startsWith: DEMO_CODE_PREFIX } },
        })
      ).count;
      removed.detentionCells = (
        await tx.detentionCell.deleteMany({
          where: { code: { startsWith: DEMO_CODE_PREFIX } },
        })
      ).count;

      if (demoOfficerIds.length) {
        await tx.peaceQuadrant.updateMany({
          where: { assignedOfficerId: { in: demoOfficerIds } },
          data: { assignedOfficerId: null },
        });
        await tx.department.updateMany({
          where: { commanderId: { in: demoOfficerIds } },
          data: { commanderId: null },
        });
        await tx.squad.updateMany({
          where: { leaderId: { in: demoOfficerIds } },
          data: { leaderId: null },
        });
        await tx.discenteDocument.deleteMany({
          where: { officerId: { in: demoOfficerIds } },
        });
        removed.officers = (
          await tx.officer.deleteMany({
            where: { id: { in: demoOfficerIds } },
          })
        ).count;
      }

      removed.squads = (
        await tx.squad.deleteMany({
          where: { callsign: { startsWith: DEMO_CODE_PREFIX } },
        })
      ).count;

      return removed;
    });

    this.logger.log(`Datos demo eliminados por ${actor.id}: ${JSON.stringify(counts)}`);
    return { removed: counts };
  }

  async seedDemoData(actor: AuthenticatedOfficer): Promise<{
    message: string;
    summary: Record<string, number>;
  }> {
    assertSuperAdmin(actor);

    await this.clearDemoData(actor);

    const motoriz = await this.prisma.department.findFirst({
      where: { code: 'MOTORIZ', isActive: true },
    });
    const dian = await this.prisma.department.findFirst({
      where: { code: 'DIAN', isActive: true },
    });
    const vgen = await this.prisma.department.findFirst({
      where: { code: 'VGEN', isActive: true },
    });

    if (!motoriz || !dian) {
      throw new BadRequestException(
        'Faltan comandos base (MOTORIZ, DIAN). Ejecute el bootstrap organizacional primero.',
      );
    }

    const quadrants = await this.prisma.peaceQuadrant.findMany({
      where: { isActive: true },
      orderBy: { quadrantNumber: 'asc' },
      take: 3,
    });

    const passwordHash = await bcrypt.hash(DEMO_DEFAULT_PASSWORD, BCRYPT_ROUNDS);
    const summary: Record<string, number> = {};

    const result = await this.prisma.$transaction(async (tx) => {
      const squad = await tx.squad.create({
        data: {
          name: 'Escuadra Demo Alpha',
          callsign: `${DEMO_CODE_PREFIX}ALPHA`,
          departmentId: motoriz.id,
        },
      });
      summary.squads = 1;

      const dianSquad = await tx.squad.create({
        data: {
          name: 'Escuadra Demo DIAN',
          callsign: `${DEMO_CODE_PREFIX}DIAN`,
          departmentId: dian.id,
        },
      });
      summary.squads = 2;

      const officerRows: Array<{ id: string; cedula: string; departmentId: string }> = [];
      for (let i = 0; i < DEMO_OFFICERS.length; i++) {
        const seed = DEMO_OFFICERS[i];
        const dept = i < 3 ? motoriz : i < 5 ? dian : (vgen ?? motoriz);
        const officer = await tx.officer.create({
          data: {
            cedula: seed.cedula,
            nombres: seed.nombres,
            apellidos: seed.apellidos,
            grado: seed.grado,
            credentialNumber: `DEMO-CRED-${String(i + 1).padStart(3, '0')}`,
            rangeRole: i === 0 ? RangeRole.JEFE_DEPARTAMENTO : RangeRole.OFICIAL_ACTIVO,
            divisionRole: i === 0 ? DivisionRole.DIRECTOR : DivisionRole.ORDINARIO,
            departmentId: dept.id,
            squadId: i < 3 ? squad.id : null,
            passwordHash,
            permissions: ALL_SITOP_PERMISSIONS,
          },
        });
        officerRows.push({
          id: officer.id,
          cedula: officer.cedula,
          departmentId: officer.departmentId,
        });
      }
      summary.officers = officerRows.length;

      await tx.squad.update({
        where: { id: squad.id },
        data: { leaderId: officerRows[0].id },
      });

      if (quadrants[0]) {
        await tx.peaceQuadrant.update({
          where: { id: quadrants[0].id },
          data: { assignedOfficerId: officerRows[1].id },
        });
      }

      const cellA = await tx.detentionCell.create({
        data: {
          code: `${DEMO_CODE_PREFIX}CAL-A`,
          name: 'Calabozo Demo A',
          block: 'Bloque Norte',
          capacity: 6,
        },
      });
      const cellB = await tx.detentionCell.create({
        data: {
          code: `${DEMO_CODE_PREFIX}CAL-B`,
          name: 'Calabozo Demo B',
          block: 'Bloque Sur',
          capacity: 4,
        },
      });
      summary.detentionCells = 2;

      await tx.inventoryAsset.createMany({
        data: [
          {
            code: `${DEMO_CODE_PREFIX}PAT-01`,
            name: 'Patrulla Demo 01',
            assetType: AssetType.PATRULLA,
            plate: 'DEMO01',
            status: AssetStatus.OPERATIVO,
            departmentId: motoriz.id,
            assignedOfficerId: officerRows[1].id,
            turno: 'MAÑANA',
          },
          {
            code: `${DEMO_CODE_PREFIX}MOTO-01`,
            name: 'Moto Demo 01',
            assetType: AssetType.MOTO,
            plate: 'DEMO-M1',
            status: AssetStatus.OPERATIVO,
            departmentId: motoriz.id,
            turno: 'TARDE',
          },
        ],
      });
      summary.inventory = 2;

      const weapon = await tx.weapon.create({
        data: {
          serialNumber: `${DEMO_CODE_PREFIX}PIST-001`,
          tipo: 'Pistola 9mm',
          marca: 'Demo Arms',
          status: WeaponStatus.ASIGNADA,
          departmentId: dian.id,
        },
      });
      await tx.weaponAssignment.create({
        data: {
          weaponId: weapon.id,
          officerId: officerRows[3].id,
          assignedByOfficerId: actor.id,
          assignedAt: daysAgo(2),
        },
      });
      summary.weapons = 1;

      const today = todayDateOnly();
      for (const officer of officerRows.slice(0, 4)) {
        await tx.officerShift.create({
          data: {
            fecha: today,
            horaInicio: '06:00',
            horaFin: '18:00',
            status: ShiftStatus.ON_DUTY_ACTIVE,
            checkedInAt: daysAgo(0, 6, 5),
            officerId: officer.id,
            departmentId: officer.departmentId,
          },
        });
      }
      summary.shifts = 4;

      const demoSquadOfficers = officerRows.slice(0, 3);
      const quadrant = quadrants[0];

      const createPatrol = async (params: {
        code: string;
        role: MinuteRole;
        daysBack: number;
        concepto: string;
        asunto: string;
        descripcion: string;
        acciones?: string;
      }) => {
        const eventAt = daysAgo(params.daysBack, 14 + params.daysBack);
        const patrol = await tx.patrolMinute.create({
          data: {
            code: params.code,
            patrolType: PatrolType.MINUTA,
            minuteRole: params.role,
            parroquia: quadrant?.parroquia ?? 'San Francisco',
            cuadrante: quadrant?.code ?? 'C-184',
            lugar: 'Av. 62 con calle 149A, Conjunto Residencial Sabana Grande',
            concepto: params.concepto,
            asunto: params.asunto,
            reseñaPrefix: DEFAULT_MINUTE_RESEÑA_PREFIX,
            descripcion: params.descripcion,
            accionesTomadas: params.acciones ?? 'Resguardo del sitio\nPresencia policial.',
            unidades: 'Patrulla DEMO-01',
            eventAt,
            createdAt: eventAt,
            departmentId: motoriz.id,
            squadId: squad.id,
            peaceQuadrantId: quadrant?.id,
            createdByOfficerId: actor.id,
            officers: {
              create: demoSquadOfficers.map((officer, index) => ({
                officerId: officer.id,
                departmentId: officer.departmentId,
                squadId: squad.id,
                isSquadLeader: index === 0,
              })),
            },
            vehicles: {
              create: [
                {
                  plate: 'DEMO01',
                  vehicleType: VehicleType.CAMIONETA,
                  notes: 'Unidad de demostración',
                },
              ],
            },
          },
        });
        return patrol;
      };

      const patrolSalidaCurso = await createPatrol({
        code: `${DEMO_CODE_PREFIX}PAT-001`,
        role: MinuteRole.SALIDA,
        daysBack: 0,
        concepto: 'Patrullaje preventivo',
        asunto: 'Presencia policial en sector',
        descripcion:
          'Siendo las 14:30 horas se realiza patrullaje preventivo en el sector Sur América sin novedad hasta el momento.',
      });

      await tx.procedure.create({
        data: {
          code: `${DEMO_CODE_PREFIX}PROC-001`,
          status: ProcedureStatus.EN_CURSO,
          departmentId: motoriz.id,
          squadId: squad.id,
          departureMinuteId: patrolSalidaCurso.id,
          createdAt: daysAgo(0, 14, 30),
        },
      });

      const patrolSalidaPendiente = await createPatrol({
        code: `${DEMO_CODE_PREFIX}PAT-002`,
        role: MinuteRole.SALIDA,
        daysBack: 1,
        concepto: 'Robo',
        asunto: 'Atención de denuncia ciudadana',
        descripcion:
          'Se despacha comisión por reporte de robo en residencial. Personal en ruta hacia el lugar.',
      });
      const patrolLlegadaPendiente = await createPatrol({
        code: `${DEMO_CODE_PREFIX}PAT-003`,
        role: MinuteRole.LLEGADA,
        daysBack: 1,
        concepto: 'Robo',
        asunto: 'Atención de denuncia ciudadana',
        descripcion:
          'Llegada al lugar. Se confirma hurto de moto. Se inicia traslado de ciudadano involucrado.',
        acciones: 'Levantamiento de acta\nTraslado a comando',
      });
      await tx.procedure.create({
        data: {
          code: `${DEMO_CODE_PREFIX}PROC-002`,
          status: ProcedureStatus.PENDIENTE_CIERRE,
          departmentId: motoriz.id,
          squadId: squad.id,
          departureMinuteId: patrolSalidaPendiente.id,
          arrivalMinuteId: patrolLlegadaPendiente.id,
          bringsDetainee: true,
          bringsObjects: false,
          mergedNarrative: 'Procedimiento demo pendiente de cierre con detenido.',
          createdAt: daysAgo(1, 9, 0),
        },
      });

      const patrolSalidaCerrado = await createPatrol({
        code: `${DEMO_CODE_PREFIX}PAT-004`,
        role: MinuteRole.SALIDA,
        daysBack: 3,
        concepto: 'Microtráfico',
        asunto: 'Apoyo a unidad del ZODI',
        descripcion: 'Intervención conjunta en punto de referencia del sector.',
      });
      const patrolLlegadaCerrado = await createPatrol({
        code: `${DEMO_CODE_PREFIX}PAT-005`,
        role: MinuteRole.LLEGADA,
        daysBack: 3,
        concepto: 'Microtráfico',
        asunto: 'Apoyo a unidad del ZODI',
        descripcion: 'Intervención culminada. Material incautado y ciudadano trasladado.',
      });
      const detaineeCalabozo = await tx.detainee.create({
        data: {
          cedula: DEMO_DETAINEES[0].cedula,
          nombres: DEMO_DETAINEES[0].nombres,
          apellidos: DEMO_DETAINEES[0].apellidos,
          alias: DEMO_DETAINEES[0].alias,
          status: DetaineeStatus.EN_CALABOZO,
          detentionCellId: cellA.id,
          ingresoAt: daysAgo(3, 18, 0),
          notas: 'Ingreso demo por procedimiento cerrado.',
          records: {
            create: {
              delito: 'Microtráfico',
              officerId: officerRows[0].id,
            },
          },
        },
      });
      await tx.procedure.create({
        data: {
          code: `${DEMO_CODE_PREFIX}PROC-003`,
          status: ProcedureStatus.EXITOSO,
          outcome: ProcedureOutcome.TRASLADO_CIUDADANO,
          departmentId: dian.id,
          squadId: squad.id,
          departureMinuteId: patrolSalidaCerrado.id,
          arrivalMinuteId: patrolLlegadaCerrado.id,
          bringsDetainee: true,
          fijacionCompleta: true,
          fijaciones: 'Fijación demo: 1 bolsa con sustancia, 1 balanza.',
          detaineeId: detaineeCalabozo.id,
          closedAt: daysAgo(3, 19, 0),
          closedByOfficerId: actor.id,
          createdAt: daysAgo(3, 8, 0),
        },
      });

      const patrolSalidaFijacion = await createPatrol({
        code: `${DEMO_CODE_PREFIX}PAT-006`,
        role: MinuteRole.SALIDA,
        daysBack: 2,
        concepto: 'Alteración del orden público',
        asunto: 'Control de tránsito',
        descripcion: 'Despliegue por alteración del orden en vía principal.',
      });
      const patrolLlegadaFijacion = await createPatrol({
        code: `${DEMO_CODE_PREFIX}PAT-007`,
        role: MinuteRole.LLEGADA,
        daysBack: 2,
        concepto: 'Alteración del orden público',
        asunto: 'Control de tránsito',
        descripcion: 'Se neutraliza alteración y se retiene ciudadano agresor.',
      });
      const detaineeTransito = await tx.detainee.create({
        data: {
          cedula: DEMO_DETAINEES[1].cedula,
          nombres: DEMO_DETAINEES[1].nombres,
          apellidos: DEMO_DETAINEES[1].apellidos,
          status: DetaineeStatus.EN_TRANSITO,
          notas: 'Pendiente fijación completa en comando (demo).',
          records: {
            create: {
              delito: 'Alteración del orden público',
              officerId: officerRows[2].id,
            },
          },
        },
      });
      await tx.procedure.create({
        data: {
          code: `${DEMO_CODE_PREFIX}PROC-004`,
          status: ProcedureStatus.PENDIENTE_FIJACION,
          outcome: ProcedureOutcome.TRASLADO_CIUDADANO,
          departmentId: motoriz.id,
          squadId: squad.id,
          departureMinuteId: patrolSalidaFijacion.id,
          arrivalMinuteId: patrolLlegadaFijacion.id,
          bringsDetainee: true,
          fijaciones: 'Fijación parcial en calle — pendiente comando.',
          fijacionCompleta: false,
          detaineeId: detaineeTransito.id,
          createdAt: daysAgo(2, 11, 0),
        },
      });

      await tx.detainee.create({
        data: {
          cedula: DEMO_DETAINEES[2].cedula,
          nombres: DEMO_DETAINEES[2].nombres,
          apellidos: DEMO_DETAINEES[2].apellidos,
          alias: DEMO_DETAINEES[2].alias,
          status: DetaineeStatus.EN_CALABOZO,
          detentionCellId: cellB.id,
          ingresoAt: daysAgo(5, 16, 0),
          notas: 'Detenida demo — audiencia programada.',
          records: {
            create: {
              delito: 'Robo',
              officerId: officerRows[4]?.id ?? officerRows[0].id,
            },
          },
          hearings: {
            create: {
              fecha: daysAgo(-7, 10, 0),
              tribunal: 'Tribunal de Control Demo',
              resultado: 'Pendiente',
              observaciones: 'Audiencia de presentación demo.',
            },
          },
        },
      });
      summary.detainees = 3;

      await createPatrol({
        code: `${DEMO_CODE_PREFIX}PAT-008`,
        role: MinuteRole.SALIDA,
        daysBack: 7,
        concepto: 'Resguardo de instalaciones',
        asunto: 'Recorrido verificación y resguardo a instalaciones',
        descripcion:
          'Recorrido de verificación en conjunto residencial. Todo conforme sin novedad.',
      });
      await createPatrol({
        code: `${DEMO_CODE_PREFIX}PAT-009`,
        role: MinuteRole.SALIDA,
        daysBack: 10,
        concepto: 'Accidente de tránsito',
        asunto: 'Control de tránsito',
        descripcion: 'Atención de accidente menor en intersección. Se regula tránsito.',
      });
      await createPatrol({
        code: `${DEMO_CODE_PREFIX}PAT-010`,
        role: MinuteRole.SALIDA,
        daysBack: 14,
        concepto: 'Verificación operativa',
        asunto: 'Presencia policial en sector',
        descripcion: 'Verificación operativa en comercios del cuadrante.',
      });
      summary.patrols = 10;
      summary.procedures = 4;

      const demoIncidentSquad = dianSquad;
      if (demoIncidentSquad) {
        await tx.incident.createMany({
          data: [
            {
              code: `${DEMO_CODE_PREFIX}INC-001`,
              tipoDelito: 'Hurto',
              status: IncidentStatus.DESPACHADO,
              parroquia: quadrant?.parroquia ?? 'San Francisco',
              cuadrante: quadrant?.code ?? 'C-184',
              descripcion: 'Denuncia ciudadana por hurto de vehículo (demo).',
              departmentId: dian.id,
              squadId: demoIncidentSquad.id,
              origen: IncidentOrigin.PUBLICO_ANONIMO,
              createdAt: daysAgo(4),
            },
            {
              code: `${DEMO_CODE_PREFIX}INC-002`,
              tipoDelito: 'Violencia de género',
              status: IncidentStatus.PROCESADO,
              parroquia: quadrant?.parroquia ?? 'San Francisco',
              cuadrante: quadrant?.code ?? 'C-184',
              descripcion: 'Caso demo atendido por unidad VGEN.',
              departmentId: (vgen ?? dian).id,
              squadId: demoIncidentSquad.id,
              origen: IncidentOrigin.INTERNO,
              createdAt: daysAgo(8),
              closedAt: daysAgo(7),
            },
          ],
        });
        summary.incidents = 2;
      }

      await tx.controlPoint.create({
        data: {
          name: `${DEMO_CODE_PREFIX}Puesto Sur América`,
          address: 'Av. 62, sector Sur América',
          pointType: 'PUESTO',
          departmentId: motoriz.id,
          latitude: 10.56,
          longitude: -71.61,
        },
      });
      summary.controlPoints = 1;

      return summary;
    });

    this.logger.log(`Datos demo generados por ${actor.id}`);

    return {
      message:
        'Historial demo creado. Funcionarios demo ingresan con su cédula V-99001xxx y clave Demo2026!',
      summary: result,
    };
  }
}
