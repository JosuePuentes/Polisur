import { resolveSharpConcurrency } from './image-processor.constants';

type QueuedTask<T> = {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  task: () => Promise<T>;
};

/**
 * Semáforo ligero para limitar concurrencia Sharp sin dependencias ESM.
 */
export class SharpConcurrencyGate {
  private active = 0;
  private readonly queue: QueuedTask<unknown>[] = [];
  private readonly maxConcurrency: number;

  constructor(maxConcurrency = resolveSharpConcurrency()) {
    this.maxConcurrency = maxConcurrency;
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        resolve: resolve as (value: unknown) => void,
        reject,
        task,
      });
      void this.drain();
    });
  }

  private async drain(): Promise<void> {
    while (this.active < this.maxConcurrency && this.queue.length > 0) {
      const next = this.queue.shift();

      if (!next) {
        return;
      }

      this.active += 1;

      void next
        .task()
        .then(next.resolve)
        .catch(next.reject)
        .finally(() => {
          this.active -= 1;
          void this.drain();
        });
    }
  }
}
