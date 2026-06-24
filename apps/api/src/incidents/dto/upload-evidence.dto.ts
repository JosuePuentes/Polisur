import { EvidenceStage } from '@polisur/database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UploadEvidenceDto {
  @ApiProperty({
    description: 'Identificador único del incidente al que se adjunta la evidencia',
    example: 'clxincident000000000000000001',
  })
  @IsString()
  @IsNotEmpty()
  incidentId!: string;

  @ApiProperty({
    enum: EvidenceStage,
    description: 'Etapa táctica de la evidencia fotográfica',
    example: EvidenceStage.RETORNO_CALLE,
  })
  @IsEnum(EvidenceStage, {
    message: 'stage debe ser RETORNO_CALLE o RESEÑA_COMANDO',
  })
  stage!: EvidenceStage;

  @ApiPropertyOptional({
    description: 'Descripción opcional del registro fotográfico',
    maxLength: 500,
    example: 'Sustancias incautadas en el sitio del procedimiento',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
