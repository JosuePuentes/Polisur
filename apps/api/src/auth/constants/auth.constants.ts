/** Hash bcrypt precomputado (12 rondas) para mitigar timing attacks cuando el usuario no existe. */
export const TIMING_SAFE_DUMMY_HASH =
  '$2b$12$ck8hPCOKZLCmSwXS4QY79OygmrYjBa/yXqUtGFdRcNfNjYKvWSKG.';

export const JWT_EXPIRES_IN = '8h' as const;

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCK_WINDOW_MS = 15 * 60 * 1000;
