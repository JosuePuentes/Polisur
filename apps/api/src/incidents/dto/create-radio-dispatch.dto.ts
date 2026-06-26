import { IncidentStatus } from '@polisur/database';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const RADIO_DISPATCH_STATUSES = [
  IncidentStatus.EN_TRANSITO,
  IncidentStatus.DESPACHADO,
] as const;

export class CreateRadioDispatchDto {
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
  @IsIn(RADIO_DISPATCH_STATUSES)
  initialStatus?: (typeof RADIO_DISPATCH_STATUSES)[number];
}
