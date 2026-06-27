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

export function OfficerPhotoInterceptor(): Type<NestInterceptor> {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    private readonly uploadMiddleware: ReturnType<typeof multer.prototype.single>;

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

      this.uploadMiddleware = upload.single('profile_photo');
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
                      : 'Error al procesar foto del funcionario',
                  ),
            );
            return;
          }

          void this.optimizePhoto(request)
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

    private async optimizePhoto(request: { file?: Express.Multer.File }): Promise<void> {
      const file = request.file;
      if (!file?.buffer) return;
      const optimized = await this.imageProcessor.optimize(file.buffer);
      file.buffer = optimized;
      file.size = optimized.length;
      file.mimetype = 'image/webp';
    }
  }

  return mixin(MixinInterceptor);
}
