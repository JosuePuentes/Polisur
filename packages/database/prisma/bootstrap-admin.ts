import { PrismaClient, RangeRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main(): Promise<void> {
  const cedula = process.env.BOOTSTRAP_CEDULA?.trim();
  const password = process.env.BOOTSTRAP_PASSWORD;

  if (!cedula || !password) {
    throw new Error(
      'Defina BOOTSTRAP_CEDULA y BOOTSTRAP_PASSWORD en el entorno antes de ejecutar el bootstrap.',
    );
  }

  const nombres = process.env.BOOTSTRAP_NOMBRES ?? 'Administrador';
  const apellidos = process.env.BOOTSTRAP_APELLIDOS ?? 'SITOP';
  const credentialNumber =
    process.env.BOOTSTRAP_CREDENTIAL ?? `POL-ADM-${cedula.replace(/\D/g, '').slice(-8)}`;

  if (password.length < 8) {
    throw new Error('BOOTSTRAP_PASSWORD debe tener al menos 8 caracteres.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const department =
    (await prisma.department.findFirst({ where: { code: 'DECT' } })) ??
    (await prisma.department.create({
      data: {
        code: 'DECT',
        name: 'Dirección de Estrategia y Control Táctico',
        description: 'Mando General — bootstrap inicial',
      },
    }));

  const existing = await prisma.officer.findUnique({ where: { cedula } });

  if (existing) {
    await prisma.officer.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        rangeRole: RangeRole.SUPER_ADMIN,
        isSuspended: false,
        departmentId: department.id,
      },
    });
    console.log(`✔ Usuario actualizado: cédula ${cedula} (SUPER_ADMIN)`);
    return;
  }

  await prisma.officer.create({
    data: {
      cedula,
      nombres,
      apellidos,
      rangeRole: RangeRole.SUPER_ADMIN,
      passwordHash,
      credentialNumber,
      departmentId: department.id,
    },
  });

  console.log(`✔ Usuario creado: cédula ${cedula} (SUPER_ADMIN)`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`❌ Bootstrap fallido: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
