export const API_ERROR_CODES = ['INVALID_REQUEST', 'AUTH_REQUIRED', 'REGISTERED_IDENTITY_REQUIRED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'RATE_LIMITED', 'INTERNAL_ERROR'] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
export interface ApiError {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}
