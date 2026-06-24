import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Type,
  mixin,
} from '@nestjs/common';
import multer from 'multer';
import { memoryStorage } from 'multer';
import { Observable, from, switchMap } from 'rxjs';
import { ImageProcessorService } from '../services/image-processor.service';

const ALLOWED_MIME_TYPES = /^image\/(jpeg|jpg|png|webp)$/i;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

/**
 * Interceptor compuesto: captura multipart + optimiza in-memory con Sharp
 * antes de llegar al controlador (sin escribir el original a disco).
 */
export function EvidenceUploadInterceptor(
  fieldName = 'file',
): Type<NestInterceptor> {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    private readonly uploadMiddleware: ReturnType<
      typeof multer.prototype.single
    >;

    constructor(private readonly imageProcessor: ImageProcessorService) {
      const upload = multer({
        storage: memoryStorage(),
        limits: { fileSize: MAX_FILE_SIZE, files: 1 },
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

      this.uploadMiddleware = upload.single(fieldName);
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
                      : 'Error al procesar la carga multipart',
                  ),
            );
            return;
          }

          from(this.optimizeUploadedFile(request))
            .pipe(switchMap(() => next.handle()))
            .subscribe({
              next: (value) => subscriber.next(value),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
        });
      });
    }

    private async optimizeUploadedFile(
      request: { file?: Express.Multer.File },
    ): Promise<void> {
      const file = request.file;

      if (!file?.buffer) {
        throw new BadRequestException(
          'Debe adjuntar una imagen en el campo "file" (multipart/form-data)',
        );
      }

      const optimized = await this.imageProcessor.optimize(file.buffer);

      file.buffer = optimized;
      file.size = optimized.length;
      file.mimetype = 'image/webp';
      file.originalname = file.originalname.replace(/\.\w+$/, '.webp');
    }
  }

  return mixin(MixinInterceptor);
}
