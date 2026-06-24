import { EvidenceStage } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateEvidenceDto {
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'urlImagen debe ser una URL HTTP(S) válida' },
  )
  @IsNotEmpty()
  @MaxLength(2048)
  urlImagen!: string;

  @IsString()
  @IsNotEmpty()
  incidentId!: string;

  @IsEnum(EvidenceStage, {
    message: `stage debe ser ${EvidenceStage.RETORNO_CALLE} o ${EvidenceStage.RESEÑA_COMANDO}`,
  })
  stage!: EvidenceStage;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
