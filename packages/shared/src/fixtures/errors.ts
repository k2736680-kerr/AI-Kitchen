import type { ApiError } from '../api/errors';

export const FIXTURE_ERRORS: Readonly<Record<'invalidRequest' | 'notFound' | 'internalError', ApiError>> = {
  invalidRequest: { code: 'INVALID_REQUEST', message: '至少选择一种食材后才能生成菜谱。' },
  notFound: { code: 'NOT_FOUND', message: '找不到请求的固定菜谱。' },
  internalError: { code: 'INTERNAL_ERROR', message: '固定数据暂时不可用，请稍后重试。' },
};
