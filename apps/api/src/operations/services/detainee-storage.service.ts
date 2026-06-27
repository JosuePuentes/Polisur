import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { access, constants, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { withTimeout } from '../../common/utils/async-timeout.util';

export const DETAINEE_FILENAME_PATTERN =
  /^[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]+-\d+-[a-f0-9]{8}\.webp$/;

const MKDIR_TIMEOUT_MS = Number(process.env.EVIDENCE_MKDIR_TIMEOUT_MS ?? 5_000);

function resolveFallbackStorageDir(): string {
  return join(process.cwd(), 'uploads', 'detainees');
}

@Injectable()
export class DetaineeStorageService {
  private readonly logger = new Logger(DetaineeStorageService.name);

  private readonly preferredStorageDir =
    process.env.DETAINEE_STORAGE_DIR ??
    join(
      process.env.EVIDENCE_STORAGE_DIR ?? '/var/data/uploads/evidence',
      '..',
      'detainees',
    );

  private readonly apiBaseUrl =
    process.env.DETAINEE_API_BASE_URL ??
    `${process.env.API_PUBLIC_URL ?? 'http://localhost:3001'}/api/operations/detainees/files`;

  private storageDir = resolveFallbackStorageDir();
  private writable = false;
  private initPromise: Promise<void> | null = null;

  ensureStorageReady(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.prepareStorage();
    }
    return this.initPromise;
  }

  private async prepareStorage(): Promise<void> {
    const fallbackDir = resolveFallbackStorageDir();
    const candidates = [
      this.preferredStorageDir,
      ...(this.preferredStorageDir !== fallbackDir ? [fallbackDir] : []),
    ];

    for (const candidate of candidates) {
      try {
        await withTimeout(
          mkdir(candidate, { recursive: true }),
          MKDIR_TIMEOUT_MS,
          `mkdir ${candidate}`,
        );
        await access(candidate, constants.W_OK | constants.R_OK);
        this.storageDir = candidate;
        this.writable = true;
        this.logger.log(`Almacén de fotos de detenidos listo: ${candidate}`);
        return;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'error desconocido';
        this.logger.warn(
          `No se pudo preparar almacén de detenidos en ${candidate}: ${message}`,
        );
      }
    }

    this.writable = false;
  }

  assertWritable(): void {
    if (!this.writable) {
      throw new BadRequestException(
        'Almacén de fotos de detenidos no disponible.',
      );
    }
  }

  assertSafeFilename(filename: string): void {
    if (!DETAINEE_FILENAME_PATTERN.test(filename)) {
      throw new BadRequestException('Nombre de archivo no válido');
    }
  }

  resolveAbsolutePath(filename: string): string {
    this.assertSafeFilename(filename);
    return join(this.storageDir, filename);
  }

  buildPublicApiUrl(filename: string): string {
    this.assertSafeFilename(filename);
    return `${this.apiBaseUrl}/${filename}`;
  }

  async saveWebp(
    buffer: Buffer,
    detaineeId: string,
    kind: string,
  ): Promise<{ filename: string; publicUrl: string }> {
    await this.ensureStorageReady();
    this.assertWritable();

    const suffix = randomBytes(4).toString('hex');
    const filename = `${detaineeId}-${kind}-${Date.now()}-${suffix}.webp`;
    await writeFile(join(this.storageDir, filename), buffer);

    return {
      filename,
      publicUrl: this.buildPublicApiUrl(filename),
    };
  }
}
