import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RangeRole } from '@polisur/database';

export class CreateOfficerDto {
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

  @IsEnum(RangeRole)
  rangeRole!: RangeRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  credentialNumber!: string;

  @IsString()
  @IsNotEmpty()
  departmentId!: string;

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
