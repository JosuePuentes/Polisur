import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import {
  AUTH_COOKIE,
  COOKIE_OPTIONS,
  SESSION_COOKIE,
} from './constants';
import type { JwtPayload, LoginRequest, LoginResponse, OfficerSession } from './types/auth.types';

export async function loginRequest(
  credentials: LoginRequest,
): Promise<LoginResponse> {
  const { API_BASE_URL } = await import('./constants');

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error('LOGIN_FAILED');
  }

  return response.json() as Promise<LoginResponse>;
}

export function decodeJwtPayload(token: string): JwtPayload {
  return jwtDecode<JwtPayload>(token);
}

export function mapPayloadToSession(payload: JwtPayload): OfficerSession {
  return {
    id: payload.sub,
    rangeRole: payload.rangeRole,
    departmentId: payload.departmentId,
    squadId: payload.squadId ?? null,
    permissions: (payload.permissions ?? []) as OfficerSession['permissions'],
  };
}

export function persistAuthSession(
  accessToken: string,
  session: OfficerSession,
): void {
  Cookies.set(AUTH_COOKIE, accessToken, COOKIE_OPTIONS);
  Cookies.set(SESSION_COOKIE, JSON.stringify(session), COOKIE_OPTIONS);
}

export function clearAuthSession(): void {
  Cookies.remove(AUTH_COOKIE);
  Cookies.remove(SESSION_COOKIE);
}

export function getAccessToken(): string | undefined {
  return Cookies.get(AUTH_COOKIE);
}

export function getSession(): OfficerSession | null {
  const raw = Cookies.get(SESSION_COOKIE);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OfficerSession;
  } catch {
    return null;
  }
}

export async function authenticateOfficer(
  cedula: string,
  password: string,
): Promise<OfficerSession> {
  const { accessToken } = await loginRequest({ cedula, password });
  const payload = decodeJwtPayload(accessToken);
  const session = mapPayloadToSession(payload);

  persistAuthSession(accessToken, session);
  return session;
}
