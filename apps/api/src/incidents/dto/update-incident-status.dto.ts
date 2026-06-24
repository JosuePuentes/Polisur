import { IncidentStatus } from '@polisur/database';
import { IsEnum } from 'class-validator';

export class UpdateIncidentStatusDto {
  @IsEnum(IncidentStatus, {
    message: 'status debe ser un valor válido de IncidentStatus',
  })
  status!: IncidentStatus;
}
