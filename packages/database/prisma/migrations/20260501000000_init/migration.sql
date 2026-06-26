-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RangeRole" AS ENUM ('SUPER_ADMIN', 'JEFE_DEPARTAMENTO', 'OFICIAL_ACTIVO', 'DISCENTE');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('PENDIENTE', 'DESPACHADO', 'EN_TRANSITO', 'PENDIENTE_RESEÑA', 'PROCESADO', 'CERRADO');

-- CreateEnum
CREATE TYPE "EvidenceStage" AS ENUM ('RETORNO_CALLE', 'RESEÑA_COMANDO');

-- CreateEnum
CREATE TYPE "IncidentOrigin" AS ENUM ('INTERNO', 'PUBLICO_ANONIMO', 'PUBLICO_PANICO');

-- CreateEnum
CREATE TYPE "AuditActionKind" AS ENUM ('HTTP_REQUEST', 'CRITICAL_ACTION');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OFF_DUTY', 'ON_DUTY_PENDING', 'ON_DUTY_ACTIVE');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('PATRULLA', 'MOTO', 'EQUIPO', 'RADIO', 'OTRO');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('OPERATIVO', 'MANTENIMIENTO', 'BAJA');

-- CreateEnum
CREATE TYPE "WeaponStatus" AS ENUM ('DISPONIBLE', 'ASIGNADA', 'MANTENIMIENTO', 'BAJA');

-- CreateEnum
CREATE TYPE "DetaineeStatus" AS ENUM ('EN_CALABOZO', 'AUDIENCIA', 'TRASLADADO_FISCALIA', 'LIBERADO');

-- CreateEnum
CREATE TYPE "PatrolType" AS ENUM ('PATRULLAJE', 'MINUTA', 'PROCEDIMIENTO_MIXTO');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "address" VARCHAR(200),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "commanderId" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squads" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "callsign" VARCHAR(24),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT NOT NULL,
    "leaderId" TEXT,

    CONSTRAINT "squads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officers" (
    "id" TEXT NOT NULL,
    "cedula" VARCHAR(20) NOT NULL,
    "nombres" VARCHAR(80) NOT NULL,
    "apellidos" VARCHAR(80) NOT NULL,
    "rangeRole" "RangeRole" NOT NULL DEFAULT 'OFICIAL_ACTIVO',
    "passwordHash" VARCHAR(255),
    "credentialNumber" VARCHAR(32) NOT NULL,
    "qrToken" VARCHAR(64) NOT NULL,
    "telefono" VARCHAR(20),
    "email" VARCHAR(120),
    "fechaNacimiento" DATE,
    "direccion" VARCHAR(200),
    "grado" VARCHAR(60),
    "fechaIngreso" DATE,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT NOT NULL,
    "squadId" TEXT,
    "promocionId" TEXT,

    CONSTRAINT "officers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promociones" (
    "id" TEXT NOT NULL,
    "nombreCurso" VARCHAR(120) NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFinEstimada" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promociones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "tipoDelito" VARCHAR(120) NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "parroquia" VARCHAR(80) NOT NULL,
    "cuadrante" VARCHAR(40) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "origen" "IncidentOrigin" NOT NULL DEFAULT 'INTERNO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "departmentId" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_evidence" (
    "id" TEXT NOT NULL,
    "imageUrl" VARCHAR(2048) NOT NULL,
    "stage" "EvidenceStage" NOT NULL,
    "descripcion" VARCHAR(500),
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentId" TEXT NOT NULL,

    CONSTRAINT "incident_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "traceId" VARCHAR(36) NOT NULL,
    "actionKind" "AuditActionKind" NOT NULL DEFAULT 'HTTP_REQUEST',
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "actionLabel" VARCHAR(120),
    "officerId" TEXT,
    "rangeRole" "RangeRole",
    "clientIp" VARCHAR(45) NOT NULL,
    "httpMethod" VARCHAR(10) NOT NULL,
    "endpointUrl" VARCHAR(512) NOT NULL,
    "routeParams" JSONB,
    "queryParams" JSONB,
    "requestBody" JSONB,
    "statusCode" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "durationMs" INTEGER,
    "metadata" JSONB,
    "errorMessage" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_points" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "address" VARCHAR(200),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "pointType" VARCHAR(40) NOT NULL DEFAULT 'PUESTO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "control_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peace_quadrants" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "parroquia" VARCHAR(80) NOT NULL,
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peace_quadrants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrol_minutes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "patrolType" "PatrolType" NOT NULL DEFAULT 'MINUTA',
    "parroquia" VARCHAR(80) NOT NULL,
    "cuadrante" VARCHAR(40) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT NOT NULL,
    "squadId" TEXT,
    "createdByOfficerId" TEXT NOT NULL,
    "incidentId" TEXT,

    CONSTRAINT "patrol_minutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrol_minute_officers" (
    "id" TEXT NOT NULL,
    "isSquadLeader" BOOLEAN NOT NULL DEFAULT false,
    "externalSquad" BOOLEAN NOT NULL DEFAULT false,
    "patrolMinuteId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "departmentId" VARCHAR(64) NOT NULL,
    "squadId" VARCHAR(64),

    CONSTRAINT "patrol_minute_officers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovered_objects" (
    "id" TEXT NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" VARCHAR(40),
    "photoUrl" VARCHAR(2048),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patrolMinuteId" TEXT,
    "incidentId" TEXT,

    CONSTRAINT "recovered_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detainees" (
    "id" TEXT NOT NULL,
    "cedula" VARCHAR(20),
    "nombres" VARCHAR(80) NOT NULL,
    "apellidos" VARCHAR(80) NOT NULL,
    "alias" VARCHAR(80),
    "cellNumber" VARCHAR(20),
    "status" "DetaineeStatus" NOT NULL DEFAULT 'EN_CALABOZO',
    "ingresoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "egresoAt" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detainees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detainee_hearings" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tribunal" VARCHAR(120) NOT NULL,
    "resultado" VARCHAR(200),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detaineeId" TEXT NOT NULL,

    CONSTRAINT "detainee_hearings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detainee_records" (
    "id" TEXT NOT NULL,
    "delito" VARCHAR(120) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "detaineeId" TEXT NOT NULL,
    "incidentId" TEXT,
    "officerId" TEXT,

    CONSTRAINT "detainee_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officer_shifts" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" VARCHAR(5) NOT NULL,
    "horaFin" VARCHAR(5) NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'ON_DUTY_PENDING',
    "checkedInAt" TIMESTAMP(3),
    "checkInLatitude" DOUBLE PRECISION,
    "checkInLongitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "officerId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "officer_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_assets" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "serialNumber" VARCHAR(64),
    "status" "AssetStatus" NOT NULL DEFAULT 'OPERATIVO',
    "notas" TEXT,
    "turno" VARCHAR(20),
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,
    "assignedOfficerId" TEXT,

    CONSTRAINT "inventory_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapons" (
    "id" TEXT NOT NULL,
    "serialNumber" VARCHAR(64) NOT NULL,
    "tipo" VARCHAR(60) NOT NULL,
    "marca" VARCHAR(60),
    "modelo" VARCHAR(60),
    "status" "WeaponStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,

    CONSTRAINT "weapons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapon_assignments" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "turno" VARCHAR(40),
    "observaciones" TEXT,
    "weaponId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "assignedByOfficerId" TEXT NOT NULL,

    CONSTRAINT "weapon_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "idx_department_active_btree" ON "departments"("isActive");

-- CreateIndex
CREATE INDEX "idx_department_name_btree" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "squads_leaderId_key" ON "squads"("leaderId");

-- CreateIndex
CREATE INDEX "idx_squad_department_btree" ON "squads"("departmentId");

-- CreateIndex
CREATE INDEX "idx_squad_active_btree" ON "squads"("isActive");

-- CreateIndex
CREATE INDEX "idx_squad_name_btree" ON "squads"("name");

-- CreateIndex
CREATE UNIQUE INDEX "officers_cedula_key" ON "officers"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "officers_credentialNumber_key" ON "officers"("credentialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "officers_qrToken_key" ON "officers"("qrToken");

-- CreateIndex
CREATE INDEX "idx_officer_cedula_btree" ON "officers"("cedula");

-- CreateIndex
CREATE INDEX "idx_officer_range_role_btree" ON "officers"("rangeRole");

-- CreateIndex
CREATE INDEX "idx_officer_department_btree" ON "officers"("departmentId");

-- CreateIndex
CREATE INDEX "idx_officer_squad_btree" ON "officers"("squadId");

-- CreateIndex
CREATE INDEX "idx_officer_promocion_btree" ON "officers"("promocionId");

-- CreateIndex
CREATE INDEX "idx_officer_suspended_btree" ON "officers"("isSuspended");

-- CreateIndex
CREATE INDEX "idx_officer_name_btree" ON "officers"("apellidos", "nombres");

-- CreateIndex
CREATE INDEX "idx_promocion_inicio_btree" ON "promociones"("fechaInicio");

-- CreateIndex
CREATE INDEX "idx_promocion_fin_btree" ON "promociones"("fechaFinEstimada");

-- CreateIndex
CREATE INDEX "idx_promocion_nombre_btree" ON "promociones"("nombreCurso");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_code_key" ON "incidents"("code");

-- CreateIndex
CREATE INDEX "idx_incident_code_btree" ON "incidents"("code");

-- CreateIndex
CREATE INDEX "idx_incident_status_btree" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "idx_incident_cuadrante_btree" ON "incidents"("cuadrante");

-- CreateIndex
CREATE INDEX "idx_incident_parroquia_btree" ON "incidents"("parroquia");

-- CreateIndex
CREATE INDEX "idx_incident_department_btree" ON "incidents"("departmentId");

-- CreateIndex
CREATE INDEX "idx_incident_squad_btree" ON "incidents"("squadId");

-- CreateIndex
CREATE INDEX "idx_incident_tipo_delito_btree" ON "incidents"("tipoDelito");

-- CreateIndex
CREATE INDEX "idx_incident_status_cuadrante_btree" ON "incidents"("status", "cuadrante");

-- CreateIndex
CREATE INDEX "idx_incident_dept_status_btree" ON "incidents"("departmentId", "status");

-- CreateIndex
CREATE INDEX "idx_incident_created_btree" ON "incidents"("createdAt");

-- CreateIndex
CREATE INDEX "idx_incident_origen_btree" ON "incidents"("origen");

-- CreateIndex
CREATE INDEX "idx_evidence_incident_btree" ON "incident_evidence"("incidentId");

-- CreateIndex
CREATE INDEX "idx_evidence_stage_btree" ON "incident_evidence"("stage");

-- CreateIndex
CREATE INDEX "idx_evidence_incident_stage_btree" ON "incident_evidence"("incidentId", "stage");

-- CreateIndex
CREATE INDEX "idx_evidence_captured_btree" ON "incident_evidence"("capturedAt");

-- CreateIndex
CREATE INDEX "idx_audit_officer_btree" ON "audit_logs"("officerId");

-- CreateIndex
CREATE INDEX "idx_audit_created_btree" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "idx_audit_endpoint_btree" ON "audit_logs"("endpointUrl");

-- CreateIndex
CREATE INDEX "idx_audit_action_kind_btree" ON "audit_logs"("actionKind");

-- CreateIndex
CREATE INDEX "idx_audit_severity_btree" ON "audit_logs"("severity");

-- CreateIndex
CREATE INDEX "idx_audit_success_btree" ON "audit_logs"("success");

-- CreateIndex
CREATE INDEX "idx_control_point_dept_btree" ON "control_points"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "peace_quadrants_code_key" ON "peace_quadrants"("code");

-- CreateIndex
CREATE INDEX "idx_peace_quadrant_parroquia_btree" ON "peace_quadrants"("parroquia");

-- CreateIndex
CREATE UNIQUE INDEX "patrol_minutes_code_key" ON "patrol_minutes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "patrol_minutes_incidentId_key" ON "patrol_minutes"("incidentId");

-- CreateIndex
CREATE INDEX "idx_patrol_dept_btree" ON "patrol_minutes"("departmentId");

-- CreateIndex
CREATE INDEX "idx_patrol_created_btree" ON "patrol_minutes"("createdAt");

-- CreateIndex
CREATE INDEX "idx_patrol_officer_officer_btree" ON "patrol_minute_officers"("officerId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_patrol_officer" ON "patrol_minute_officers"("patrolMinuteId", "officerId");

-- CreateIndex
CREATE INDEX "idx_recovered_patrol_btree" ON "recovered_objects"("patrolMinuteId");

-- CreateIndex
CREATE INDEX "idx_detainee_cedula_btree" ON "detainees"("cedula");

-- CreateIndex
CREATE INDEX "idx_detainee_status_btree" ON "detainees"("status");

-- CreateIndex
CREATE INDEX "idx_hearing_detainee_btree" ON "detainee_hearings"("detaineeId");

-- CreateIndex
CREATE INDEX "idx_hearing_fecha_btree" ON "detainee_hearings"("fecha");

-- CreateIndex
CREATE INDEX "idx_detainee_record_detainee_btree" ON "detainee_records"("detaineeId");

-- CreateIndex
CREATE INDEX "idx_shift_fecha_btree" ON "officer_shifts"("fecha");

-- CreateIndex
CREATE INDEX "idx_shift_officer_fecha_btree" ON "officer_shifts"("officerId", "fecha");

-- CreateIndex
CREATE INDEX "idx_shift_dept_fecha_btree" ON "officer_shifts"("departmentId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_assets_code_key" ON "inventory_assets"("code");

-- CreateIndex
CREATE INDEX "idx_inventory_type_btree" ON "inventory_assets"("assetType");

-- CreateIndex
CREATE INDEX "idx_inventory_dept_btree" ON "inventory_assets"("departmentId");

-- CreateIndex
CREATE INDEX "idx_inventory_officer_btree" ON "inventory_assets"("assignedOfficerId");

-- CreateIndex
CREATE INDEX "idx_inventory_turno_btree" ON "inventory_assets"("turno");

-- CreateIndex
CREATE UNIQUE INDEX "weapons_serialNumber_key" ON "weapons"("serialNumber");

-- CreateIndex
CREATE INDEX "idx_weapon_status_btree" ON "weapons"("status");

-- CreateIndex
CREATE INDEX "idx_weapon_assign_weapon_btree" ON "weapon_assignments"("weaponId");

-- CreateIndex
CREATE INDEX "idx_weapon_assign_officer_btree" ON "weapon_assignments"("officerId");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_commanderId_fkey" FOREIGN KEY ("commanderId") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squads" ADD CONSTRAINT "squads_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squads" ADD CONSTRAINT "squads_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officers" ADD CONSTRAINT "officers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officers" ADD CONSTRAINT "officers_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "squads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officers" ADD CONSTRAINT "officers_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "promociones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "squads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_evidence" ADD CONSTRAINT "incident_evidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_points" ADD CONSTRAINT "control_points_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_minutes" ADD CONSTRAINT "patrol_minutes_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_minutes" ADD CONSTRAINT "patrol_minutes_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "squads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_minutes" ADD CONSTRAINT "patrol_minutes_createdByOfficerId_fkey" FOREIGN KEY ("createdByOfficerId") REFERENCES "officers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_minute_officers" ADD CONSTRAINT "patrol_minute_officers_patrolMinuteId_fkey" FOREIGN KEY ("patrolMinuteId") REFERENCES "patrol_minutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_minute_officers" ADD CONSTRAINT "patrol_minute_officers_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "officers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovered_objects" ADD CONSTRAINT "recovered_objects_patrolMinuteId_fkey" FOREIGN KEY ("patrolMinuteId") REFERENCES "patrol_minutes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detainee_hearings" ADD CONSTRAINT "detainee_hearings_detaineeId_fkey" FOREIGN KEY ("detaineeId") REFERENCES "detainees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detainee_records" ADD CONSTRAINT "detainee_records_detaineeId_fkey" FOREIGN KEY ("detaineeId") REFERENCES "detainees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detainee_records" ADD CONSTRAINT "detainee_records_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detainee_records" ADD CONSTRAINT "detainee_records_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_shifts" ADD CONSTRAINT "officer_shifts_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "officers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_shifts" ADD CONSTRAINT "officer_shifts_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_assets" ADD CONSTRAINT "inventory_assets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_assets" ADD CONSTRAINT "inventory_assets_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weapons" ADD CONSTRAINT "weapons_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weapon_assignments" ADD CONSTRAINT "weapon_assignments_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "weapons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weapon_assignments" ADD CONSTRAINT "weapon_assignments_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "officers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weapon_assignments" ADD CONSTRAINT "weapon_assignments_assignedByOfficerId_fkey" FOREIGN KEY ("assignedByOfficerId") REFERENCES "officers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
