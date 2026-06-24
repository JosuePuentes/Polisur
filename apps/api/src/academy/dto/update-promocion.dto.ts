import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class UpdatePromocionDto {
  @Type(() => Date)
  @IsDate()
  fechaFinEstimada!: Date;
}
