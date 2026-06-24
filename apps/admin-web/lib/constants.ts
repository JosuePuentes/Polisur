export const AUTH_COOKIE = 'polisur_access_token';
export const SESSION_COOKIE = 'polisur_session';

export const COOKIE_OPTIONS = {
  expires: 1 / 3, // ~8 horas (alineado con JWT del backend)
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
