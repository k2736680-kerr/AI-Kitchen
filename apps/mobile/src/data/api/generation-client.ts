import {
  GENERATION_API_PATH,
  GenerationApiResponseSchema,
  type GenerationApiRequest,
  type GenerationApiResponse,
} from '@ai-kitchen/shared';

export type GenerationClientErrorKind = 'network' | 'timeout' | 'invalid-response' | 'configuration';

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
}
