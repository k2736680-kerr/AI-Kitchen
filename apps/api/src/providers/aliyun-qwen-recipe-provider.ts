import { COOKING_METHOD_OPTIONS, type GenerationRequest } from '@ai-kitchen/shared';

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

  public async generateBatch(request: GenerationRequest, signal: AbortSignal): Promise<ReadonlyArray<unknown | null>> {
    const methods = pickCookingMethods(request.candidateCount, request.excludedRecipes);
    const attempts = await Promise.allSettled(
      methods.map((method) => this.call(buildRecipeSystemPrompt(request.locale), buildRecipeUserPrompt(request, method), signal)),
    );
    const values = attempts.map((attempt) => (attempt.status === 'fulfilled' ? attempt.value : null));
    // 全部失败时按顺序抛出首个错误,让服务端走 rate_limited/timeout/unavailable 分支
    if (values.every((value) => value === null)) {
      const firstFailure = attempts.find((attempt): attempt is PromiseRejectedResult => attempt.status === 'rejected');
      if (firstFailure) throw firstFailure.reason;
    }
    return values;
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
            temperature: this.config.temperature,
            top_p: this.config.topP,
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

/**
 * 从烹饪方式池中按需选取,优先覆盖不同做法,并跳过已排除(上一批已生成)的方式;
 * 候选数超过剩余可选项时循环复用可选项。
 */
function pickCookingMethods(
  count: number,
  excludedRecipes: ReadonlyArray<{ readonly title: string; readonly cookingMethod: (typeof COOKING_METHOD_OPTIONS)[number] }> = [],
): readonly (typeof COOKING_METHOD_OPTIONS)[number][] {
  if (count <= 0) return ['stir-fry'];
  const excluded = new Set(excludedRecipes.map((recipe) => recipe.cookingMethod));
  const available = COOKING_METHOD_OPTIONS.filter((method) => !excluded.has(method));
  const pool = available.length > 0 ? available : COOKING_METHOD_OPTIONS;
  const methods: (typeof COOKING_METHOD_OPTIONS)[number][] = [];
  for (let index = 0; index < count; index += 1) {
    methods.push(pool[index % pool.length]);
  }
  return methods;
}
