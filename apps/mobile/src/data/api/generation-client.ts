import {
  GENERATION_API_PATH,
  GenerationApiResponseSchema,
  HISTORY_API_PATH,
  HISTORY_VISIT_API_PATH,
  HistoryListResponseSchema,
  HistoryVisitResponseSchema,
  RECIPE_API_PATH_PREFIX,
  RecipeApiResponseSchema,
  type GenerationApiRequest,
  type GenerationApiResponse,
  type HistoryListResponse,
  type HistoryVisitRequest,
  type Recipe,
} from '@ai-kitchen/shared';

export type GenerationClientErrorKind = 'network' | 'timeout' | 'invalid-response' | 'configuration' | 'not-found';

export class GenerationClientError extends Error {
  public constructor(
    public readonly kind: GenerationClientErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'GenerationClientError';
  }
}

export class GenerationApiClient {
  public constructor(private readonly baseUrl: string) {}

  public async generate(request: GenerationApiRequest, signal: AbortSignal): Promise<GenerationApiResponse> {
    if (!this.baseUrl) throw new GenerationClientError('configuration', '远程生成服务地址未配置。');
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${GENERATION_API_PATH}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-request-id': request.requestId,
          'x-idempotency-key': request.idempotencyKey,
        },
        body: JSON.stringify(request),
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw new GenerationClientError('timeout', '生成请求超时。');
      throw new GenerationClientError('network', '暂时无法连接生成服务。');
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new GenerationClientError('invalid-response', '生成服务返回了无法识别的结果。');
    }
    const parsed = GenerationApiResponseSchema.safeParse(payload);
    if (!parsed.success) throw new GenerationClientError('invalid-response', '生成服务返回了无法识别的结果。');
    return parsed.data;
  }

  public async getRecipe(recipeId: string, signal: AbortSignal): Promise<Recipe> {
    const payload = await this.requestJson(`${RECIPE_API_PATH_PREFIX}/${encodeURIComponent(recipeId)}`, { method: 'GET', headers: { Accept: 'application/json' }, signal });
    const parsed = RecipeApiResponseSchema.safeParse(payload);
    if (!parsed.success) throw new GenerationClientError('invalid-response', '菜谱服务返回了无法识别的结果。');
    return parsed.data.recipe;
  }

  public async listHistory(guestId: string, signal: AbortSignal): Promise<HistoryListResponse> {
    const query = new URLSearchParams({ guestId, limit: '20' });
    const payload = await this.requestJson(`${HISTORY_API_PATH}?${query.toString()}`, { method: 'GET', headers: { Accept: 'application/json' }, signal });
    const parsed = HistoryListResponseSchema.safeParse(payload);
    if (!parsed.success) throw new GenerationClientError('invalid-response', '历史服务返回了无法识别的结果。');
    return parsed.data;
  }

  public async recordHistoryVisit(visit: HistoryVisitRequest, signal: AbortSignal): Promise<void> {
    const payload = await this.requestJson(HISTORY_VISIT_API_PATH, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(visit), signal });
    if (!HistoryVisitResponseSchema.safeParse(payload).success) throw new GenerationClientError('invalid-response', '历史服务返回了无法识别的结果。');
  }

  private async requestJson(path: string, init: RequestInit): Promise<unknown> {
    if (!this.baseUrl) throw new GenerationClientError('configuration', '远程生成服务地址未配置。');
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, init);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw new GenerationClientError('timeout', '请求超时。');
      throw new GenerationClientError('network', '暂时无法连接服务。');
    }
    if (response.status === 404) throw new GenerationClientError('not-found', '未找到请求的菜谱。');
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new GenerationClientError('invalid-response', '服务返回了无法识别的结果。'); }
    if (!response.ok) throw new GenerationClientError('network', '服务暂时不可用，请稍后重试。');
    return payload;
  }
}
