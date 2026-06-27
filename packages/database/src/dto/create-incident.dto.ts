import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VehicleType } from '@prisma/client';

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  tipoDelito!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  parroquia!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  cuadrante!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  descripcion!: string;

  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @IsString()
  @IsNotEmpty()
  squadId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  subjectCedula?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  vehiclePlate?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;
}
