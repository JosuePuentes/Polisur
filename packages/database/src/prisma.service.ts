import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    const timeoutMs = Number(process.env.PRISMA_CONNECT_TIMEOUT_MS ?? 15_000);

    try {
      await Promise.race([
        this.$connect(),
        new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(`Conexión a PostgreSQL excedió ${timeoutMs}ms`),
              ),
            timeoutMs,
          );
        }),
      ]);
      this.logger.log('Conexión a PostgreSQL establecida');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'error desconocido';
      this.logger.warn(
        `PostgreSQL no disponible al arranque (${message}); se reintentará en la primera consulta.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Conexión a PostgreSQL cerrada');
  }
}
