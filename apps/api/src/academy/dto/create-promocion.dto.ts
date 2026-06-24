import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePromocionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombreCurso!: string;

  @Type(() => Date)
  @IsDate()
  fechaInicio!: Date;

  @Type(() => Date)
  @IsDate()
  fechaFinEstimada!: Date;
}
