import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Type,
  mixin,
} from '@nestjs/common';
import multer, { memoryStorage } from 'multer';
import { Observable, from, switchMap } from 'rxjs';
import { MAX_PUBLIC_EVIDENCE_FILES } from '../constants/cuadrante-coordinates.constants';
import { ImageProcessorService } from '../../incidents/services/image-processor.service';

const ALLOWED_MIME_TYPES = /^image\/(jpeg|jpg|png|webp)$/i;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

/**
 * Multipart opcional (0–3 imágenes) con optimización Sharp in-memory.
 */
export function PublicEvidenceUploadInterceptor(
  fieldName = 'evidencias',
  maxCount = MAX_PUBLIC_EVIDENCE_FILES,
): Type<NestInterceptor> {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    private readonly uploadMiddleware: ReturnType<
      typeof multer.prototype.array
    >;

    constructor(private readonly imageProcessor: ImageProcessorService) {
      const upload = multer({
        storage: memoryStorage(),
        limits: { fileSize: MAX_FILE_SIZE, files: maxCount },
        fileFilter: (_req, file, callback) => {
          if (!ALLOWED_MIME_TYPES.test(file.mimetype)) {
            callback(
              new BadRequestException(
                'Formato no permitido. Solo JPG, JPEG, PNG y WebP',
              ),
            );
            return;
          }
          callback(null, true);
        },
      });

      this.uploadMiddleware = upload.array(fieldName, maxCount);
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      const http = context.switchToHttp();
      const request = http.getRequest();
      const response = http.getResponse();

      return new Observable((subscriber) => {
        this.uploadMiddleware(request, response, (error: unknown) => {
          if (error) {
            subscriber.error(
              error instanceof BadRequestException
                ? error
                : new BadRequestException(
                    error instanceof Error
                      ? error.message
                      : 'Error al procesar evidencias multipart',
                  ),
            );
            return;
          }

          from(this.optimizeUploadedFiles(request))
            .pipe(switchMap(() => next.handle()))
            .subscribe({
              next: (value) => subscriber.next(value),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
        });
      });
    }

    private async optimizeUploadedFiles(
      request: { files?: Express.Multer.File[] },
    ): Promise<void> {
      const files = request.files ?? [];

      for (const file of files) {
        if (!file.buffer?.length) {
          throw new BadRequestException(
            'Una de las evidencias adjuntas está vacía o es inválida',
          );
        }

        const optimized = await this.imageProcessor.optimize(file.buffer);
        file.buffer = optimized;
        file.size = optimized.length;
        file.mimetype = 'image/webp';
        file.originalname = file.originalname.replace(/\.\w+$/, '.webp');
      }
    }
  }

  return mixin(MixinInterceptor);
}
