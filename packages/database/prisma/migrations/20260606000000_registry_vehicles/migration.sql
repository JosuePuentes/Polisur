-- Vehículos en minutas, campos de búsqueda y registro unificado

CREATE TYPE "VehicleType" AS ENUM ('AUTO', 'MOTO', 'CAMIONETA', 'CAMION', 'BICICLETA', 'OTRO');

ALTER TABLE "incidents" ADD COLUMN "subjectCedula" VARCHAR(20);
ALTER TABLE "incidents" ADD COLUMN "vehiclePlate" VARCHAR(16);
ALTER TABLE "incidents" ADD COLUMN "vehicleType" "VehicleType";

CREATE INDEX "idx_incident_subject_cedula_btree" ON "incidents"("subjectCedula");
CREATE INDEX "idx_incident_vehicle_plate_btree" ON "incidents"("vehiclePlate");

ALTER TABLE "recovered_objects" ADD COLUMN "identifier" VARCHAR(32);
CREATE INDEX "idx_recovered_identifier_btree" ON "recovered_objects"("identifier");

CREATE TABLE "patrol_minute_vehicles" (
    "id" TEXT NOT NULL,
    "plate" VARCHAR(16) NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "ownerCedula" VARCHAR(20),
    "notes" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patrolMinuteId" TEXT NOT NULL,

    CONSTRAINT "patrol_minute_vehicles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_patrol_vehicle_minute_btree" ON "patrol_minute_vehicles"("patrolMinuteId");
CREATE INDEX "idx_patrol_vehicle_plate_btree" ON "patrol_minute_vehicles"("plate");
CREATE INDEX "idx_patrol_vehicle_owner_cedula_btree" ON "patrol_minute_vehicles"("ownerCedula");

ALTER TABLE "patrol_minute_vehicles" ADD CONSTRAINT "patrol_minute_vehicles_patrolMinuteId_fkey" FOREIGN KEY ("patrolMinuteId") REFERENCES "patrol_minutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_assets" ADD COLUMN "plate" VARCHAR(16);
CREATE INDEX "idx_inventory_plate_btree" ON "inventory_assets"("plate");
