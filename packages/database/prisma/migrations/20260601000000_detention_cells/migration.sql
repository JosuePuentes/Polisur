-- CreateEnum
CREATE TYPE "DetaineePhotoKind" AS ENUM ('FRONT', 'PROFILE_LEFT', 'PROFILE_RIGHT', 'BACK', 'DOCUMENT', 'OTHER');

-- CreateTable
CREATE TABLE "detention_cells" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "block" VARCHAR(80),
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detention_cells_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "detention_cells_code_key" ON "detention_cells"("code");
CREATE INDEX "idx_detention_cell_active_btree" ON "detention_cells"("isActive");

-- AlterTable
ALTER TABLE "detainees" ADD COLUMN "detentionCellId" TEXT,
ADD COLUMN "isConvicted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sentenceYears" DOUBLE PRECISION;

CREATE INDEX "idx_detainee_cell_btree" ON "detainees"("detentionCellId");
CREATE INDEX "idx_detainee_convicted_btree" ON "detainees"("isConvicted");

-- CreateTable
CREATE TABLE "detainee_photos" (
    "id" TEXT NOT NULL,
    "kind" "DetaineePhotoKind" NOT NULL,
    "label" VARCHAR(120),
    "filename" VARCHAR(255) NOT NULL,
    "publicUrl" VARCHAR(500) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detaineeId" TEXT NOT NULL,

    CONSTRAINT "detainee_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_detainee_photo_detainee_btree" ON "detainee_photos"("detaineeId");

-- AddForeignKey
ALTER TABLE "detainees" ADD CONSTRAINT "detainees_detentionCellId_fkey" FOREIGN KEY ("detentionCellId") REFERENCES "detention_cells"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "detainee_photos" ADD CONSTRAINT "detainee_photos_detaineeId_fkey" FOREIGN KEY ("detaineeId") REFERENCES "detainees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Celdas iniciales
INSERT INTO "detention_cells" ("id", "code", "name", "block", "capacity", "isActive", "createdAt", "updatedAt")
VALUES
  ('cell_seed_a1', 'CELDA-A1', 'Celda A-1', 'Bloque A', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cell_seed_a2', 'CELDA-A2', 'Celda A-2', 'Bloque A', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cell_seed_b1', 'CELDA-B1', 'Celda B-1', 'Bloque B', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cell_seed_b2', 'CELDA-B2', 'Celda B-2', 'Bloque B', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
