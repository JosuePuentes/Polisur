-- Cuadrantes de Paz: comuna, número oficial y funcionario asignado

ALTER TABLE "peace_quadrants" ADD COLUMN "quadrantNumber" INTEGER;
ALTER TABLE "peace_quadrants" ADD COLUMN "comuna" VARCHAR(120);
ALTER TABLE "peace_quadrants" ADD COLUMN "assignedOfficerId" TEXT;

CREATE INDEX "idx_peace_quadrant_number_btree" ON "peace_quadrants"("quadrantNumber");
CREATE INDEX "idx_peace_quadrant_officer_btree" ON "peace_quadrants"("assignedOfficerId");

ALTER TABLE "peace_quadrants" ADD CONSTRAINT "peace_quadrants_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
