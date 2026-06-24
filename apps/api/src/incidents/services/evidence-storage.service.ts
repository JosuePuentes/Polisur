import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { EVIDENCE_FILENAME_PATTERN } from './image-processor.constants';

@Injectable()
export class EvidenceStorageService {
  private readonly storageDir =
    process.env.EVIDENCE_STORAGE_DIR ??
    join(process.cwd(), 'uploads', 'evidence');

  private readonly apiEvidenceBaseUrl =
    process.env.EVIDENCE_API_BASE_URL ??
    `${process.env.API_PUBLIC_URL ?? 'http://localhost:3001'}/api/incidents/evidence`;

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
    await mkdir(this.storageDir, { recursive: true });

    const suffix = randomBytes(4).toString('hex');
    const filename = `${incidentId}-${Date.now()}-${suffix}.webp`;
    const absolutePath = join(this.storageDir, filename);

    await writeFile(absolutePath, buffer);

    return this.buildPublicApiUrl(filename);
  }
}
