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
import { Observable } from 'rxjs';
import { ImageProcessorService } from '../../incidents/services/image-processor.service';

const IMAGE_MIME = /^image\/(jpeg|jpg|png|webp)$/i;
const PDF_MIME = /^application\/pdf$/i;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

export const DISCENTE_FILE_FIELDS = [
  { name: 'file_1', maxCount: 1 },
  { name: 'file_2', maxCount: 1 },
  { name: 'file_3', maxCount: 1 },
  { name: 'file_4', maxCount: 1 },
  { name: 'file_5', maxCount: 1 },
  { name: 'file_6', maxCount: 1 },
] as const;

export function DiscenteFilesInterceptor(): Type<NestInterceptor> {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    private readonly uploadMiddleware: ReturnType<typeof multer.prototype.fields>;

    constructor(private readonly imageProcessor: ImageProcessorService) {
      const upload = multer({
        storage: memoryStorage(),
        limits: { fileSize: MAX_FILE_SIZE, files: 6 },
        fileFilter: (_req, file, callback) => {
          if (!IMAGE_MIME.test(file.mimetype) && !PDF_MIME.test(file.mimetype)) {
            callback(
              new BadRequestException(
                'Formato no permitido. Solo JPG, PNG, WebP o PDF',
              ),
            );
            return;
          }
          callback(null, true);
        },
      });

      this.uploadMiddleware = upload.fields([...DISCENTE_FILE_FIELDS]);
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
                      : 'Error al procesar archivos del discente',
                  ),
            );
            return;
          }

          void this.optimizeImages(request)
            .then(() => {
              next.handle().subscribe({
                next: (value) => subscriber.next(value),
                error: (err) => subscriber.error(err),
                complete: () => subscriber.complete(),
              });
            })
            .catch((err: unknown) => subscriber.error(err));
        });
      });
    }

    private async optimizeImages(request: {
      files?: Record<string, Express.Multer.File[]>;
    }): Promise<void> {
      const files = request.files ?? {};

      for (const fieldFiles of Object.values(files)) {
        for (const file of fieldFiles) {
          if (!file.buffer || !IMAGE_MIME.test(file.mimetype)) continue;
          const optimized = await this.imageProcessor.optimize(file.buffer);
          file.buffer = optimized;
          file.size = optimized.length;
          file.mimetype = 'image/webp';
        }
      }
    }
  }

  return mixin(MixinInterceptor);
}
