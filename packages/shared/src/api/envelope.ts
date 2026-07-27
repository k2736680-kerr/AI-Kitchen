import type { ApiError } from './errors';

export interface ApiSuccess<T> { readonly ok: true; readonly data: T; readonly requestId: string; }
export interface ApiFailure { readonly ok: false; readonly error: ApiError; readonly requestId: string; }
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
export const createApiSuccess = <T>(data: T, requestId: string): ApiSuccess<T> => ({ ok: true, data, requestId });
export const createApiFailure = (error: ApiError, requestId: string): ApiFailure => ({ ok: false, error, requestId });
