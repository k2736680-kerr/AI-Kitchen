export const API_ERROR_CODES = [
  'INVALID_REQUEST',
  'SCHEMA_VERSION_UNSUPPORTED',
  'AUTH_REQUIRED',
  'REGISTERED_IDENTITY_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'IDEMPOTENCY_CONFLICT',
  'IDEMPOTENCY_IN_PROGRESS',
  'RATE_LIMITED',
  'GENERATION_FAILED',
  'TIMEOUT',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
export interface ApiError {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}
