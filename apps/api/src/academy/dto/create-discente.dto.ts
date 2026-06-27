import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiscenteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cedula!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  apellidos!: string;

  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @IsString()
  @IsNotEmpty()
  promocionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  tipoSangre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  alturaCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pesoKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  colorPiel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contextura?: string;
}
