import { describe, expect, it } from 'vitest';
import { API_ERROR_CODES, type ApiError } from './errors';
import { createApiFailure, createApiSuccess, type ApiResult } from './envelope';

describe('API contracts', () => {
  it('exposes unique stable error codes', () => {
    expect(API_ERROR_CODES).toEqual([
      'INVALID_REQUEST', 'SCHEMA_VERSION_UNSUPPORTED', 'AUTH_REQUIRED', 'REGISTERED_IDENTITY_REQUIRED',
      'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'IDEMPOTENCY_CONFLICT', 'IDEMPOTENCY_IN_PROGRESS',
      'RATE_LIMITED', 'GENERATION_FAILED', 'TIMEOUT', 'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR',
    ]);
    expect(new Set(API_ERROR_CODES).size).toBe(API_ERROR_CODES.length);
  });
  it('creates a success envelope', () => {
    const data = { value: 42 };
    expect(createApiSuccess(data, 'request-1')).toEqual({ ok: true, data, requestId: 'request-1' });
  });
  it('creates a failure envelope', () => {
    const error: ApiError = { code: 'AUTH_REQUIRED', message: 'Authentication required' };
    expect(createApiFailure(error, 'request-2')).toEqual({ ok: false, error, requestId: 'request-2' });
  });
  it('narrows results by ok', () => {
    const results: Array<ApiResult<string>> = [createApiSuccess('ok', 'request-3'), createApiFailure({ code: 'NOT_FOUND', message: 'Not found' }, 'request-4')];
    expect(results.map((result) => result.ok ? result.data : result.error.code)).toEqual(['ok', 'NOT_FOUND']);
  });
  it('keeps input object references unchanged', () => {
    const data = { value: 1 };
    const error: ApiError = { code: 'CONFLICT', message: 'Conflict' };
    expect(createApiSuccess(data, 'request-5').data).toBe(data);
    expect(createApiFailure(error, 'request-6').error).toBe(error);
  });
});
