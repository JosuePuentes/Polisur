import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateOfficerProfileDto {
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
}
