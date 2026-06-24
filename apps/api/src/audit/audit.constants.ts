export const SENSITIVE_FIELD_PATTERN =
  /password|passwd|secret|token|authorization|credential|hash|qr/i;

export const CEDULA_FIELD_PATTERN = /cedula|dni|documento/i;

export const REDACTED_VALUE = '[REDACTED]';

export const BINARY_REDACTED_PREFIX = '[BINARY_REDACTED';

export const CRITICAL_ACTION_LABELS = {
  INCIDENT_STATUS_PROCESADO: 'INCIDENT_STATUS_PROCESADO',
  ACADEMY_MASS_GRADUATION: 'ACADEMY_MASS_GRADUATION',
} as const;

export type CriticalActionLabel =
  (typeof CRITICAL_ACTION_LABELS)[keyof typeof CRITICAL_ACTION_LABELS];
