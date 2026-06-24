export interface LoginRequest {
  cedula: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

export interface JwtPayload {
  sub: string;
  rangeRole: string;
  departmentId: string;
  squadId?: string | null;
  iat?: number;
  exp?: number;
}

export interface OfficerSession {
  id: string;
  rangeRole: string;
  departmentId: string;
  squadId?: string | null;
}

export interface ApiErrorBody {
  message?: string | string[];
  statusCode?: number;
}
