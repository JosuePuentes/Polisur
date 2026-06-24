/** Opciones compartidas de entrada Sharp — aplicadas al instanciar cada pipeline */
export const SHARP_INPUT_OPTIONS = {
  failOn: 'error' as const,
  limitInputPixels: 25_000_000,
  sequentialRead: true,
};

export const ALLOWED_IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp']);

export const MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const MAX_OUTPUT_WIDTH = 1200;
export const OUTPUT_WEBP_QUALITY = 75;
export const OUTPUT_DPI = 72;

/** Concurrencia Sharp: mínimo 2, máximo 4 (configurable vía env) */
export function resolveSharpConcurrency(): number {
  const parsed = Number(process.env.SHARP_CONCURRENCY ?? 3);

  if (Number.isNaN(parsed)) {
    return 3;
  }

  return Math.min(4, Math.max(2, Math.floor(parsed)));
}

export const EVIDENCE_FILENAME_PATTERN = /^[a-zA-Z0-9_-]+\.webp$/;
