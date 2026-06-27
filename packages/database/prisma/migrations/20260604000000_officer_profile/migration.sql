-- Rol dentro del comando / división
CREATE TYPE "DivisionRole" AS ENUM ('SIN_ASIGNAR', 'DIRECTOR', 'SUB_DIRECTOR', 'ORDINARIO');

ALTER TABLE "officers" ADD COLUMN "divisionRole" "DivisionRole" NOT NULL DEFAULT 'SIN_ASIGNAR';
ALTER TABLE "officers" ADD COLUMN "profilePhotoFilename" VARCHAR(120);
