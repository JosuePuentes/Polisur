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

const ALLOWED_MIME_TYPES = /^image\/(jpeg|jpg|png|webp)$/i;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const PHOTO_FIELDS = [
  { name: 'photo_front', maxCount: 1 },
  { name: 'photo_left', maxCount: 1 },
  { name: 'photo_right', maxCount: 1 },
  { name: 'photo_back', maxCount: 1 },
  { name: 'photo_doc_1', maxCount: 1 },
  { name: 'photo_doc_2', maxCount: 1 },
] as const;

export function DetaineePhotosInterceptor(): Type<NestInterceptor> {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    private readonly uploadMiddleware: ReturnType<
      typeof multer.prototype.fields
    >;

    constructor(private readonly imageProcessor: ImageProcessorService) {
      const upload = multer({
        storage: memoryStorage(),
        limits: { fileSize: MAX_FILE_SIZE, files: 6 },
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

      this.uploadMiddleware = upload.fields([...PHOTO_FIELDS]);
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
                      : 'Error al procesar fotos del detenido',
                  ),
            );
            return;
          }

          void this.optimizeFiles(request)
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

    private async optimizeFiles(request: {
      files?: Record<string, Express.Multer.File[]>;
    }): Promise<void> {
      const files = request.files ?? {};

      for (const fieldFiles of Object.values(files)) {
        for (const file of fieldFiles) {
          if (!file.buffer) continue;
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

export const DETAINEE_PHOTO_FIELD_MAP: Record<
  string,
  { kind: string; label: string; isPrimary?: boolean }
> = {
  photo_front: { kind: 'FRONT', label: 'Frente', isPrimary: true },
  photo_left: { kind: 'PROFILE_LEFT', label: 'Perfil izquierdo' },
  photo_right: { kind: 'PROFILE_RIGHT', label: 'Perfil derecho' },
  photo_back: { kind: 'BACK', label: 'Espalda' },
  photo_doc_1: { kind: 'DOCUMENT', label: 'Documento 1' },
  photo_doc_2: { kind: 'DOCUMENT', label: 'Documento 2' },
};
