import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import sharp from 'sharp';
import {
  CORRUPT_BUFFER,
  INVALID_GIF_BUFFER,
} from './__fixtures__/image.fixtures';
import { ImageProcessorService } from './image-processor.service';

describe('ImageProcessorService', () => {
  let service: ImageProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageProcessorService],
    }).compile();

    service = module.get(ImageProcessorService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('optimiza un buffer PNG válido a WebP reduciendo peso', async () => {
    const largePng = await sharp({
      create: {
        width: 2000,
        height: 1500,
        channels: 3,
        background: { r: 200, g: 100, b: 50 },
      },
    })
      .png()
      .toBuffer();

    const result = await service.optimize(largePng);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(largePng.length);

    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(1200);
  });

  it('optimiza un PNG mínimo válido sin lanzar error', async () => {
    const minimalPng = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await service.optimize(minimalPng);
    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe('webp');
  });

  it('lanza BadRequestException si el buffer está vacío', async () => {
    await expect(service.optimize(Buffer.alloc(0))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza BadRequestException ante formato no permitido (GIF)', async () => {
    await expect(service.optimize(INVALID_GIF_BUFFER)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.optimize(INVALID_GIF_BUFFER)).rejects.toThrow(
      /Formato no válido/,
    );
  });

  it('lanza BadRequestException ante datos que no son imagen', async () => {
    const plainText = Buffer.from('esto-no-es-una-imagen', 'utf8');

    await expect(service.optimize(plainText)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza BadRequestException ante archivo corrupto sin colgar el proceso', async () => {
    await expect(service.optimize(CORRUPT_BUFFER)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.optimize(CORRUPT_BUFFER)).rejects.toThrow(
      /corrupto|no válido/i,
    );
  });

  it('rechaza archivos que exceden el tamaño máximo permitido', async () => {
    const oversized = Buffer.alloc(8 * 1024 * 1024 + 1, 1);

    await expect(service.optimize(oversized)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.optimize(oversized)).rejects.toThrow(/excede el tamaño/);
  });
});
