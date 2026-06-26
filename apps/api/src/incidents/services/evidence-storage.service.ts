import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { access, constants, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { EVIDENCE_FILENAME_PATTERN } from './image-processor.constants';

export interface EvidenceStorageHealth {
  status: 'up' | 'down';
  path: string;
  writable: boolean;
  persistent: boolean;
}

const PERSISTENT_MOUNT_PREFIX = '/var/data';

function resolveFallbackStorageDir(): string {
  return join(process.cwd(), 'uploads', 'evidence');
}

function isPersistentPath(path: string): boolean {
  return path.startsWith(PERSISTENT_MOUNT_PREFIX);
}

@Injectable()
export class EvidenceStorageService implements OnModuleInit {
  private readonly logger = new Logger(EvidenceStorageService.name);

  private readonly preferredStorageDir =
    process.env.EVIDENCE_STORAGE_DIR ?? '/var/data/uploads/evidence';

  private readonly apiEvidenceBaseUrl =
    process.env.EVIDENCE_API_BASE_URL ??
    `${process.env.API_PUBLIC_URL ?? 'http://localhost:3001'}/api/incidents/evidence`;

  private storageDir = resolveFallbackStorageDir();
  private writable = false;

  getStorageDir(): string {
    return this.storageDir;
  }

  async onModuleInit(): Promise<void> {
    await this.ensureStorageReady();
  }

  async ensureStorageReady(): Promise<void> {
    const fallbackDir = resolveFallbackStorageDir();
    const candidates = [
      this.preferredStorageDir,
      ...(this.preferredStorageDir !== fallbackDir ? [fallbackDir] : []),
    ];

    for (const candidate of candidates) {
      try {
        await mkdir(candidate, { recursive: true });
        await access(candidate, constants.W_OK | constants.R_OK);
        this.storageDir = candidate;
        this.writable = true;

        if (candidate !== this.preferredStorageDir) {
          this.logger.warn(
            `Almacén persistente no disponible (${this.preferredStorageDir}). ` +
              `Usando ruta efímera: ${candidate}. ` +
              'En Render, monte un disco en /var/data y configure EVIDENCE_STORAGE_DIR=/var/data/uploads/evidence',
          );
        } else {
          this.logger.log(`Almacén de evidencias listo: ${candidate}`);
        }
        return;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'error desconocido';
        this.logger.warn(
          `No se pudo preparar almacén en ${candidate}: ${message}`,
        );
      }
    }

    this.writable = false;
    this.logger.error(
      'Almacén de evidencias no disponible; las cargas de fotos fallarán hasta corregir permisos o montaje de disco.',
    );
  }

  async getHealth(): Promise<EvidenceStorageHealth> {
    try {
      await access(this.storageDir, constants.W_OK | constants.R_OK);
      return {
        status: 'up',
        path: this.storageDir,
        writable: true,
        persistent: isPersistentPath(this.storageDir),
      };
    } catch {
      return {
        status: 'down',
        path: this.storageDir,
        writable: false,
        persistent: isPersistentPath(this.storageDir),
      };
    }
  }

  assertWritable(): void {
    if (!this.writable) {
      throw new BadRequestException(
        'Almacén de evidencias no disponible. Contacte al administrador del sistema.',
      );
    }
  }

  assertSafeFilename(filename: string): void {
    if (!EVIDENCE_FILENAME_PATTERN.test(filename)) {
      throw new BadRequestException('Nombre de archivo de evidencia no válido');
    }
  }

  resolveAbsolutePath(filename: string): string {
    this.assertSafeFilename(filename);
    return join(this.storageDir, filename);
  }

  buildPublicApiUrl(filename: string): string {
    this.assertSafeFilename(filename);
    return `${this.apiEvidenceBaseUrl}/${filename}`;
  }

  extractFilenameFromImageUrl(imageUrl: string): string {
    const segment = imageUrl.split('/').pop();

    if (!segment || !EVIDENCE_FILENAME_PATTERN.test(segment)) {
      throw new BadRequestException('URL de evidencia no reconocida');
    }

    return segment;
  }

  async saveOptimizedWebp(
    buffer: Buffer,
    incidentId: string,
  ): Promise<string> {
    this.assertWritable();
    await mkdir(this.storageDir, { recursive: true });

    const suffix = randomBytes(4).toString('hex');
    const filename = `${incidentId}-${Date.now()}-${suffix}.webp`;
    const absolutePath = join(this.storageDir, filename);

    await writeFile(absolutePath, buffer);

    return this.buildPublicApiUrl(filename);
  }
}
