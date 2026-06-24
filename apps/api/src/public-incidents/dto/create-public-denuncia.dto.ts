import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePublicDenunciaDto {
  @ApiProperty({
    example: 'Robo / Hurto',
    description: 'Tipo de delito reportado por el ciudadano',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  delito!: string;

  @ApiProperty({ example: 'San Francisco' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  parroquia!: string;

  @ApiProperty({
    example: 'Sector La Floresta / Cuadrante 04',
    description: 'Referencia de ubicación o sector reportado',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  sector!: string;

  @ApiProperty({
    minLength: 10,
    example: 'Relato detallado de los hechos ocurridos…',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  descripcion!: string;
}

export class PublicDenunciaResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  cuadrante!: string;

  @ApiProperty()
  message!: string;
}
