export const SENSITIVE_FIELD_PATTERN =
  /password|passwd|secret|token|authorization|credential|hash|qr/i;

export const CEDULA_FIELD_PATTERN = /cedula|dni|documento/i;

export const REDACTED_VALUE = '[REDACTED]';

export const BINARY_REDACTED_PREFIX = '[BINARY_REDACTED';

export {
  CRITICAL_ACTION_LABELS,
  type CriticalActionLabel,
} from './audit-taxonomy';
