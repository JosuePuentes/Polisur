import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  LOGIN_LOCK_WINDOW_MS,
  LOGIN_MAX_ATTEMPTS,
} from '../constants/auth.constants';

interface AttemptBucket {
  failures: number;
  lockedUntil: number;
}

@Injectable()
export class LoginThrottleService {
  private readonly buckets = new Map<string, AttemptBucket>();

  assertNotLocked(key: string): void {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return;
    }

    if (Date.now() < bucket.lockedUntil) {
      throw new HttpException(
        'Demasiados intentos de inicio de sesión. Intente nuevamente más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (bucket.failures >= LOGIN_MAX_ATTEMPTS) {
      this.buckets.delete(key);
    }
  }

  recordFailure(key: string): void {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || now >= current.lockedUntil) {
      const failures = (current && now >= current.lockedUntil ? 0 : current?.failures ?? 0) + 1;

      if (failures >= LOGIN_MAX_ATTEMPTS) {
        this.buckets.set(key, {
          failures,
          lockedUntil: now + LOGIN_LOCK_WINDOW_MS,
        });
        return;
      }

      this.buckets.set(key, { failures, lockedUntil: 0 });
      return;
    }

    current.failures += 1;
    if (current.failures >= LOGIN_MAX_ATTEMPTS) {
      current.lockedUntil = now + LOGIN_LOCK_WINDOW_MS;
    }
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  buildKey(clientIp: string, cedula: string): string {
    return `${clientIp}:${cedula.trim().toLowerCase()}`;
  }
}
