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
}

@Injectable()
export class EvidenceStorageService implements OnModuleInit {
  private readonly logger = new Logger(EvidenceStorageService.name);

  private readonly storageDir =
    process.env.EVIDENCE_STORAGE_DIR ??
    join(process.cwd(), 'uploads', 'evidence');

  private readonly apiEvidenceBaseUrl =
    process.env.EVIDENCE_API_BASE_URL ??
    `${process.env.API_PUBLIC_URL ?? 'http://localhost:3001'}/api/incidents/evidence`;

  private writable = false;

  getStorageDir(): string {
    return this.storageDir;
  }

  async onModuleInit(): Promise<void> {
    await this.ensureStorageReady();
  }

  async ensureStorageReady(): Promise<void> {
    await mkdir(this.storageDir, { recursive: true });
    try {
      await access(this.storageDir, constants.W_OK | constants.R_OK);
      this.writable = true;
      this.logger.log(`Almacén de evidencias listo: ${this.storageDir}`);
    } catch {
      this.writable = false;
      this.logger.error(
        `El directorio de evidencias no es escribible: ${this.storageDir}. ` +
          'En Render, monte un disco persistente en /var/data y configure EVIDENCE_STORAGE_DIR=/var/data/evidence',
      );
    }
  }

  async getHealth(): Promise<EvidenceStorageHealth> {
    try {
      await access(this.storageDir, constants.W_OK | constants.R_OK);
      return { status: 'up', path: this.storageDir, writable: true };
    } catch {
      return { status: 'down', path: this.storageDir, writable: false };
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
