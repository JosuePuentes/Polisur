import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

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
}
