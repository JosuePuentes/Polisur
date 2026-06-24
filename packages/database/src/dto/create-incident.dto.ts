import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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
}
