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
import { MAX_MINUTE_PHOTOS } from '@polisur/database';

const ALLOWED_MIME_TYPES = /^image\/(jpeg|jpg|png|webp)$/i;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

export const PATROL_PHOTO_FIELD = 'minute_photos';

export function PatrolPhotosInterceptor(): Type<NestInterceptor> {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    private readonly uploadMiddleware: ReturnType<typeof multer.prototype.array>;

    constructor(private readonly imageProcessor: ImageProcessorService) {
      const upload = multer({
        storage: memoryStorage(),
        limits: { fileSize: MAX_FILE_SIZE, files: MAX_MINUTE_PHOTOS },
        fileFilter: (_req, file, callback) => {
          if (!ALLOWED_MIME_TYPES.test(file.mimetype)) {
            callback(
              new BadRequestException('Formato no permitido. Solo JPG, JPEG, PNG y WebP'),
            );
            return;
          }
          callback(null, true);
        },
      });

      this.uploadMiddleware = upload.array(PATROL_PHOTO_FIELD, MAX_MINUTE_PHOTOS);
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
                      : 'Error al procesar fijaciones fotográficas',
                  ),
            );
            return;
          }

          void this.optimizePhotos(request)
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

    private async optimizePhotos(request: {
      files?: Express.Multer.File[];
    }): Promise<void> {
      const files = request.files ?? [];
      for (const file of files) {
        if (!file.buffer) continue;
        const optimized = await this.imageProcessor.optimize(file.buffer);
        file.buffer = optimized;
        file.size = optimized.length;
        file.mimetype = 'image/webp';
      }
    }
  }

  return mixin(MixinInterceptor);
}
