import {
  EvidenceStage,
  IncidentStatus,
  PrismaClient,
  RangeRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD_PLAIN = 'Polisur2026*';
const BCRYPT_ROUNDS = 12;

const SEED_INCIDENT_CODE = 'POL-SEED-2026-0001';
const SEED_INCIDENT_CODE_FISCALIA = 'POL-SEED-2026-0002';

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function clearDatabase(): Promise<void> {
  console.log('🧹 Limpiando tablas (orden seguro por FK)...');

  await prisma.$transaction(async (tx) => {
    await tx.weaponAssignment.deleteMany();
    await tx.weapon.deleteMany();
    await tx.inventoryAsset.deleteMany();
    await tx.officerShift.deleteMany();
    await tx.detaineeHearing.deleteMany();
    await tx.detaineeRecord.deleteMany();
    await tx.detainee.deleteMany();
    await tx.recoveredObject.deleteMany();
    await tx.patrolMinuteOfficer.deleteMany();
    await tx.patrolMinute.deleteMany();
    await tx.peaceQuadrant.deleteMany();
    await tx.controlPoint.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.incidentEvidence.deleteMany();
    await tx.incident.deleteMany();
    await tx.squad.updateMany({ data: { leaderId: null } });
    await tx.department.updateMany({ data: { commanderId: null } });
    await tx.officer.updateMany({
      data: { squadId: null, promocionId: null },
    });
    await tx.officer.deleteMany();
    await tx.squad.deleteMany();
    await tx.promocion.deleteMany();
    await tx.department.deleteMany();
  });
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function toDateOnly(date: Date): Date {
  return new Date(date.toISOString().slice(0, 10));
}

function logSeedSummary(): void {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  Credenciales de prueba (contraseña común)');
  console.log(`  Password: ${PASSWORD_PLAIN}`);
  console.log('══════════════════════════════════════════════════');
  console.log('  SUPER_ADMIN      | cédula: V-10000001 | Comisario General');
  console.log('  JEFE_DEPARTAMENTO| cédula: V-20000001 | Jefe Antidrogas');
  console.log('  OFICIAL (líder)  | cédula: V-30000001 | Escuadra Intervención A');
  console.log('  OFICIAL (miembro)| cédula: V-30000002 | Escuadra Intervención A');
  console.log('  DISCENTE         | cédula: V-40000001 | Promoción I 2026');
  console.log('  DISCENTE         | cédula: V-40000002 | Promoción I 2026');
  console.log(`  Incidente pendiente | código: ${SEED_INCIDENT_CODE} (sin evidencias)`);
  console.log(
    `  Incidente fiscalía  | código: ${SEED_INCIDENT_CODE_FISCALIA} (PROCESADO · 4 evidencias)`,
  );
  console.log('══════════════════════════════════════════════════\n');
}

async function main(): Promise<void> {
  console.log('🌱 Iniciando seed Polisur...\n');

  await clearDatabase();

  const passwordHash = await hashPassword(PASSWORD_PLAIN);
  const today = new Date();
  const promocionFin = addMonths(today, 6);

  const deptEstrategia = await prisma.department.create({
    data: {
      code: 'DECT',
      name: 'Dirección de Estrategia y Control Táctico',
      description: 'Academia / Mando General municipal',
    },
  });

  const deptAntidrogas = await prisma.department.create({
    data: {
      code: 'DIAN',
      name: 'Dirección de Inteligencia y Antidrogas',
      description: 'Comando de inteligencia e intervención antidrogas',
    },
  });

  console.log('✔ Departamentos creados');

  const promocion = await prisma.promocion.create({
    data: {
      nombreCurso: 'Promoción I - Año 2026',
      fechaInicio: toDateOnly(today),
      fechaFinEstimada: toDateOnly(promocionFin),
    },
  });

  console.log('✔ Promoción académica creada');

  const superAdmin = await prisma.officer.create({
    data: {
      cedula: 'V-10000001',
      nombres: 'Carlos Alberto',
      apellidos: 'Mendoza Ríos',
      rangeRole: RangeRole.SUPER_ADMIN,
      passwordHash,
      credentialNumber: 'POL-GEN-001',
      departmentId: deptEstrategia.id,
    },
  });

  const jefeAntidrogas = await prisma.officer.create({
    data: {
      cedula: 'V-20000001',
      nombres: 'María Elena',
      apellidos: 'Vargas Salazar',
      rangeRole: RangeRole.JEFE_DEPARTAMENTO,
      passwordHash,
      credentialNumber: 'POL-ANT-001',
      departmentId: deptAntidrogas.id,
    },
  });

  const oficialLider = await prisma.officer.create({
    data: {
      cedula: 'V-30000001',
      nombres: 'Luis Fernando',
      apellidos: 'Peña Torres',
      rangeRole: RangeRole.OFICIAL_ACTIVO,
      passwordHash,
      credentialNumber: 'POL-ANT-002',
      departmentId: deptAntidrogas.id,
    },
  });

  const oficialMiembro = await prisma.officer.create({
    data: {
      cedula: 'V-30000002',
      nombres: 'Andrea Patricia',
      apellidos: 'Rivas Campos',
      rangeRole: RangeRole.OFICIAL_ACTIVO,
      passwordHash,
      credentialNumber: 'POL-ANT-003',
      departmentId: deptAntidrogas.id,
    },
  });

  await prisma.officer.createMany({
    data: [
      {
        cedula: 'V-40000001',
        nombres: 'Diego Alejandro',
        apellidos: 'Herrera Gil',
        rangeRole: RangeRole.DISCENTE,
        passwordHash,
        credentialNumber: 'POL-ACA-001',
        departmentId: deptEstrategia.id,
        promocionId: promocion.id,
      },
      {
        cedula: 'V-40000002',
        nombres: 'Valentina Isabel',
        apellidos: 'Mora León',
        rangeRole: RangeRole.DISCENTE,
        passwordHash,
        credentialNumber: 'POL-ACA-002',
        departmentId: deptEstrategia.id,
        promocionId: promocion.id,
      },
    ],
  });

  console.log('✔ Funcionarios creados');

  const escuadra = await prisma.squad.create({
    data: {
      name: 'Escuadra Táctica de Intervención A',
      callsign: 'ETA-ALPHA',
      departmentId: deptAntidrogas.id,
      leaderId: oficialLider.id,
    },
  });

  await prisma.officer.update({
    where: { id: oficialMiembro.id },
    data: { squadId: escuadra.id },
  });

  console.log('✔ Escuadra táctica configurada (líder + miembro)');

  await prisma.incident.create({
    data: {
      code: SEED_INCIDENT_CODE,
      tipoDelito: 'Tenencia para el consumo',
      status: IncidentStatus.PENDIENTE,
      parroquia: 'San Francisco',
      cuadrante: 'Cuadrante de Paz 04',
      descripcion:
        'Minuta de patrullaje preventivo — intervención de prueba para validación de filtros jerárquicos y restricción por escuadra.',
      departmentId: deptAntidrogas.id,
      squadId: escuadra.id,
    },
  });

  console.log('✔ Incidente de prueba creado (escenario filtros jerárquicos)');

  const incidentFiscalia = await prisma.incident.create({
    data: {
      code: SEED_INCIDENT_CODE_FISCALIA,
      tipoDelito: 'Tráfico Ilícito de Sustancias',
      status: IncidentStatus.PENDIENTE_RESEÑA,
      parroquia: 'San Francisco',
      cuadrante: 'Cuadrante de Paz 04',
      descripcion:
        'Procedimiento antidrogas con cadena de custodia completa — escenario de validación para transición PROCESADO y EvidenceValidationService.',
      departmentId: deptAntidrogas.id,
      squadId: escuadra.id,
    },
  });

  await prisma.incidentEvidence.createMany({
    data: [
      {
        incidentId: incidentFiscalia.id,
        imageUrl:
          'https://imagenes.polisur.sistema/evidencias/droga_002.jpg',
        stage: EvidenceStage.RETORNO_CALLE,
        descripcion: 'Sustancias psicotrópicas incautadas en el sitio',
      },
      {
        incidentId: incidentFiscalia.id,
        imageUrl:
          'https://imagenes.polisur.sistema/evidencias/calle_002.jpg',
        stage: EvidenceStage.RETORNO_CALLE,
        descripcion: 'Fijación del entorno público del procedimiento',
      },
      {
        incidentId: incidentFiscalia.id,
        imageUrl: 'https://imagenes.polisur.sistema/evidencias/casa_002.jpg',
        stage: EvidenceStage.RETORNO_CALLE,
        descripcion: 'Fachada del inmueble abordado',
      },
      {
        incidentId: incidentFiscalia.id,
        imageUrl:
          'https://imagenes.polisur.sistema/evidencias/resena_detenido_002.jpg',
        stage: EvidenceStage.RESEÑA_COMANDO,
        descripcion:
          'Reseña fotográfica formal del ciudadano frente al logo de la institución',
      },
    ],
  });

  await prisma.incident.update({
    where: { id: incidentFiscalia.id },
    data: { status: IncidentStatus.PROCESADO },
  });

  console.log(
    '✔ Incidente fiscalía creado (3 evidencias calle + 1 comando → PROCESADO)',
  );

  logSeedSummary();
  console.log('✅ Seed completado con éxito.');
}

main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'Error desconocido en seed';
    console.error(`❌ Seed fallido: ${message}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
