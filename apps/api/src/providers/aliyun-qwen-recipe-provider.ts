import type { GenerationRequest } from '@ai-kitchen/shared';

import type { ApiConfig } from '../config';
import { buildRecipeRepairPrompt, buildRecipeSystemPrompt, buildRecipeUserPrompt } from './recipe-prompt';
import { ProviderRateLimitError, ProviderTimeoutError, ProviderUnavailableError, type RecipeProvider } from './recipe-provider';

type ChatCompletionResponse = { choices?: Array<{ message?: { content?: unknown } }> };

export class AliyunQwenRecipeProvider implements RecipeProvider {
  public readonly name = 'aliyun-dashscope';
  public readonly model: string;

  public constructor(private readonly config: ApiConfig['dashscope']) {
    this.model = config.model;
  }

  public generate(request: GenerationRequest, signal: AbortSignal): Promise<unknown | null> {
    return this.call(buildRecipeSystemPrompt(request.locale), buildRecipeUserPrompt(request), signal);
  }

  public repair(input: { request: GenerationRequest; candidate: unknown; reason: string; signal: AbortSignal }): Promise<unknown | null> {
    return this.call(buildRecipeSystemPrompt(input.request.locale), buildRecipeRepairPrompt({ candidate: input.candidate, reason: input.reason, locale: input.request.locale }), input.signal);
  }

  private async call(systemPrompt: string, userPrompt: string, upstreamSignal: AbortSignal): Promise<unknown | null> {
    if (!this.config.apiKey) throw new ProviderUnavailableError('菜谱生成服务尚未配置。');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const forwardAbort = () => controller.abort();
    upstreamSignal.addEventListener('abort', forwardAbort, { once: true });
    try {
      let response: Response;
      try {
        response = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            model: this.config.model,
            temperature: 0.2,
            top_p: 0.8,
            stream: false,
            response_format: { type: 'json_object' },
            enable_thinking: false,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
          signal: controller.signal,
        });
      } catch {
        if (controller.signal.aborted) throw new ProviderTimeoutError('菜谱生成服务响应超时。');
        throw new ProviderUnavailableError('菜谱生成服务暂时不可用。');
      }
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after'));
        throw new ProviderRateLimitError('菜谱生成请求过于频繁。', Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined);
      }
      if (!response.ok) throw new ProviderUnavailableError('菜谱生成服务暂时不可用。');
      let payload: ChatCompletionResponse;
      try { payload = await response.json() as ChatCompletionResponse; } catch { throw new ProviderUnavailableError('菜谱生成服务返回了无效结果。'); }
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new ProviderUnavailableError('菜谱生成服务返回了无效结果。');
      let candidate: unknown;
      try { candidate = JSON.parse(content); } catch { throw new ProviderUnavailableError('菜谱生成服务返回了无效结果。'); }
      if (typeof candidate === 'object' && candidate !== null && 'status' in candidate && (candidate as { status?: unknown }).status === 'no_match') return null;
      return candidate;
    } finally {
      clearTimeout(timeout);
      upstreamSignal.removeEventListener('abort', forwardAbort);
    }
  }
}
