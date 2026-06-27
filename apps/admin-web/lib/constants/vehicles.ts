export const VEHICLE_TYPES = [
  { value: 'AUTO', label: 'Automóvil' },
  { value: 'MOTO', label: 'Motocicleta' },
  { value: 'CAMIONETA', label: 'Camioneta' },
  { value: 'CAMION', label: 'Camión' },
  { value: 'BICICLETA', label: 'Bicicleta' },
  { value: 'OTRO', label: 'Otro' },
] as const;

export type VehicleTypeValue = (typeof VEHICLE_TYPES)[number]['value'];

export interface MinuteVehicleInput {
  plate: string;
  vehicleType: VehicleTypeValue;
  ownerCedula: string;
  notes: string;
}

export const EMPTY_MINUTE_VEHICLE: MinuteVehicleInput = {
  plate: '',
  vehicleType: 'AUTO',
  ownerCedula: '',
  notes: '',
};

export const REGISTRY_SOURCE_LABELS: Record<string, string> = {
  detenido: 'Detenido',
  funcionario: 'Funcionario',
  discente: 'Discente / aspirante',
  minuta: 'Minuta',
  denuncia: 'Denuncia / incidente',
  objeto_recuperado: 'Objeto recuperado',
  vehiculo_minuta: 'Vehículo en minuta',
  inventario: 'Inventario logístico',
};
