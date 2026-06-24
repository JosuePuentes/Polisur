import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber } from 'class-validator';

export class CreatePanicAlertDto {
  @ApiProperty({ example: 10.5579, description: 'Latitud WGS84 del dispositivo' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLatitude()
  latitud!: number;

  @ApiProperty({ example: -71.633, description: 'Longitud WGS84 del dispositivo' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLongitude()
  longitud!: number;
}

export class PanicAlertResponseDto {
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
