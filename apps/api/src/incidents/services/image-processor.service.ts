import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import sharp from 'sharp';
import {
  ALLOWED_IMAGE_FORMATS,
  MAX_INPUT_BYTES,
  MAX_OUTPUT_WIDTH,
  OUTPUT_DPI,
  OUTPUT_WEBP_QUALITY,
  SHARP_INPUT_OPTIONS,
} from './image-processor.constants';
import { SharpConcurrencyGate } from './sharp-concurrency.gate';

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);
  private readonly concurrencyGate = new SharpConcurrencyGate();

  /** Encola la optimización para limitar concurrencia Sharp (2–4). */
  optimize(fileBuffer: Buffer): Promise<Buffer> {
    return this.concurrencyGate.run(() =>
      this.runOptimizePipeline(fileBuffer),
    );
  }

  private async runOptimizePipeline(fileBuffer: Buffer): Promise<Buffer> {
    if (!fileBuffer?.length) {
      throw new BadRequestException('El archivo de imagen está vacío');
    }

    if (fileBuffer.length > MAX_INPUT_BYTES) {
      throw new BadRequestException(
        `La imagen excede el tamaño máximo permitido (${MAX_INPUT_BYTES / 1024 / 1024} MB)`,
      );
    }

    try {
      const pipeline = sharp(fileBuffer, SHARP_INPUT_OPTIONS);
      const metadata = await pipeline.metadata();

      if (!metadata.format || !ALLOWED_IMAGE_FORMATS.has(metadata.format)) {
        throw new BadRequestException(
          'Formato no válido. Solo se permiten JPG, JPEG, PNG y WebP',
        );
      }

      const optimized = await pipeline
        .rotate()
        .resize(MAX_OUTPUT_WIDTH, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: OUTPUT_WEBP_QUALITY, effort: 4 })
        .withMetadata({ density: OUTPUT_DPI })
        .toBuffer();

      this.logger.debug(
        `Imagen optimizada: ${fileBuffer.length}B → ${optimized.length}B (${Math.round((1 - optimized.length / fileBuffer.length) * 100)}% reducción)`,
      );

      return optimized;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.warn(
        `Error procesando imagen: ${error instanceof Error ? error.message : 'desconocido'}`,
      );
      throw new BadRequestException(
        'Archivo corrupto o formato de imagen no válido',
      );
    }
  }
}
