-- AlterEnum
ALTER TYPE "DetaineeStatus" ADD VALUE 'EN_TRANSITO' BEFORE 'EN_CALABOZO';

-- CreateEnum
CREATE TYPE "MinuteRole" AS ENUM ('SALIDA', 'LLEGADA');
CREATE TYPE "ProcedureStatus" AS ENUM ('EN_CURSO', 'PENDIENTE_CIERRE', 'SIN_NOVEDAD', 'EXITOSO');
CREATE TYPE "ProcedureOutcome" AS ENUM ('SIN_NOVEDAD', 'TRASLADO_CIUDADANO', 'TRASLADO_OBJETO');

-- AlterTable
ALTER TABLE "patrol_minutes" ADD COLUMN "minuteRole" "MinuteRole" NOT NULL DEFAULT 'SALIDA';
CREATE INDEX "idx_patrol_minute_role_btree" ON "patrol_minutes"("minuteRole");

-- CreateTable
CREATE TABLE "procedures" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ProcedureStatus" NOT NULL DEFAULT 'EN_CURSO',
    "outcome" "ProcedureOutcome",
    "bringsDetainee" BOOLEAN,
    "bringsObjects" BOOLEAN,
    "fijaciones" TEXT,
    "mergedNarrative" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT NOT NULL,
    "squadId" TEXT,
    "departureMinuteId" TEXT NOT NULL,
    "arrivalMinuteId" TEXT,
    "detaineeId" TEXT,
    "closedByOfficerId" TEXT,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "procedures_code_key" ON "procedures"("code");
CREATE UNIQUE INDEX "procedures_departureMinuteId_key" ON "procedures"("departureMinuteId");
CREATE UNIQUE INDEX "procedures_arrivalMinuteId_key" ON "procedures"("arrivalMinuteId");
CREATE UNIQUE INDEX "procedures_detaineeId_key" ON "procedures"("detaineeId");
CREATE INDEX "idx_procedure_dept_btree" ON "procedures"("departmentId");
CREATE INDEX "idx_procedure_squad_btree" ON "procedures"("squadId");
CREATE INDEX "idx_procedure_status_btree" ON "procedures"("status");
CREATE INDEX "idx_procedure_created_btree" ON "procedures"("createdAt");

ALTER TABLE "procedures" ADD CONSTRAINT "procedures_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "squads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_departureMinuteId_fkey" FOREIGN KEY ("departureMinuteId") REFERENCES "patrol_minutes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_arrivalMinuteId_fkey" FOREIGN KEY ("arrivalMinuteId") REFERENCES "patrol_minutes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_detaineeId_fkey" FOREIGN KEY ("detaineeId") REFERENCES "detainees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_closedByOfficerId_fkey" FOREIGN KEY ("closedByOfficerId") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
