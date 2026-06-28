-- Formato oficial de minutas, catálogos y fijación pendiente

CREATE TYPE "MinuteCatalogKind" AS ENUM ('CONCEPTO', 'ASUNTO');

ALTER TYPE "ProcedureStatus" ADD VALUE 'PENDIENTE_FIJACION';

ALTER TABLE "departments" ADD COLUMN "minuteHeaderLines" JSONB;
ALTER TABLE "departments" ADD COLUMN "minuteReseñaPrefix" TEXT;
ALTER TABLE "departments" ADD COLUMN "minuteLema" TEXT;

CREATE TABLE "minute_catalog_entries" (
    "id" TEXT NOT NULL,
    "kind" "MinuteCatalogKind" NOT NULL,
    "label" VARCHAR(160) NOT NULL,
    "code" VARCHAR(32),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "minute_catalog_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_minute_catalog_kind_label" ON "minute_catalog_entries"("kind", "label");
CREATE INDEX "idx_minute_catalog_kind_btree" ON "minute_catalog_entries"("kind");
CREATE INDEX "idx_minute_catalog_label_btree" ON "minute_catalog_entries"("label");

ALTER TABLE "patrol_minutes" ADD COLUMN "lugar" VARCHAR(300);
ALTER TABLE "patrol_minutes" ADD COLUMN "concepto" VARCHAR(120);
ALTER TABLE "patrol_minutes" ADD COLUMN "asunto" VARCHAR(300);
ALTER TABLE "patrol_minutes" ADD COLUMN "reseñaPrefix" TEXT;
ALTER TABLE "patrol_minutes" ADD COLUMN "accionesTomadas" TEXT;
ALTER TABLE "patrol_minutes" ADD COLUMN "unidades" VARCHAR(200);
ALTER TABLE "patrol_minutes" ADD COLUMN "lema" TEXT;
ALTER TABLE "patrol_minutes" ADD COLUMN "eventAt" TIMESTAMP(3);
ALTER TABLE "patrol_minutes" ADD COLUMN "peaceQuadrantId" TEXT;

CREATE INDEX "idx_patrol_concepto_btree" ON "patrol_minutes"("concepto");
CREATE INDEX "idx_patrol_asunto_btree" ON "patrol_minutes"("asunto");
CREATE INDEX "idx_patrol_peace_quadrant_btree" ON "patrol_minutes"("peaceQuadrantId");

ALTER TABLE "patrol_minutes" ADD CONSTRAINT "patrol_minutes_peaceQuadrantId_fkey" FOREIGN KEY ("peaceQuadrantId") REFERENCES "peace_quadrants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "patrol_minute_photos" (
    "id" TEXT NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "label" VARCHAR(120),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patrolMinuteId" TEXT NOT NULL,

    CONSTRAINT "patrol_minute_photos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patrol_minute_photos_filename_key" ON "patrol_minute_photos"("filename");
CREATE INDEX "idx_patrol_photo_minute_btree" ON "patrol_minute_photos"("patrolMinuteId");

ALTER TABLE "patrol_minute_photos" ADD CONSTRAINT "patrol_minute_photos_patrolMinuteId_fkey" FOREIGN KEY ("patrolMinuteId") REFERENCES "patrol_minutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "procedures" ADD COLUMN "bringsVehicles" BOOLEAN;
ALTER TABLE "procedures" ADD COLUMN "bringsPersons" BOOLEAN;
ALTER TABLE "procedures" ADD COLUMN "fijacionCompleta" BOOLEAN NOT NULL DEFAULT false;
