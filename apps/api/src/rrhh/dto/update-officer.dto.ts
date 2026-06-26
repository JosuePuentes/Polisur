import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RangeRole } from '@polisur/database';

export class UpdateOfficerDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cedula?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nombres?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  apellidos?: string;

  @IsOptional()
  @IsEnum(RangeRole)
  rangeRole?: RangeRole;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  credentialNumber?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  squadId?: string;

  @IsOptional()
  @IsString()
  promocionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  grado?: string;

  @IsOptional()
  @IsDateString()
  fechaIngreso?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
