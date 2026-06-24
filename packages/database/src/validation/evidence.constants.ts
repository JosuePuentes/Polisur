import { EvidenceStage } from '@prisma/client';

/** Máximo de fotos en etapa RETORNO_CALLE (Evidencia, Calle y Casa). */
export const RETORNO_CALLE_EVIDENCE_LIMIT = 3;

/** Una única foto institucional en comando. */
export const RESENA_COMANDO_EVIDENCE_LIMIT = 1;

export const EVIDENCE_STAGE_LIMITS: Record<EvidenceStage, number> = {
  [EvidenceStage.RETORNO_CALLE]: RETORNO_CALLE_EVIDENCE_LIMIT,
  [EvidenceStage.RESEÑA_COMANDO]: RESENA_COMANDO_EVIDENCE_LIMIT,
};
