import type { GenerationRequest } from '@ai-kitchen/shared';
import type { CookingMethod } from '@ai-kitchen/shared';

export class ProviderTimeoutError extends Error {}
export class ProviderRateLimitError extends Error {
  public constructor(message: string, public readonly retryAfterSeconds?: number) { super(message); }
}
export class ProviderUnavailableError extends Error {}

export interface RecipeProvider {
  readonly name: string;
  readonly model: string;
  /**
   * 一次为同一请求生成多个候选(通常不同烹饪方式)。
   * 返回与输入顺序对应的数组，失败的槽位为 null。
   */
  generateBatch(request: GenerationRequest, signal: AbortSignal): Promise<ReadonlyArray<unknown | null>>;
  /** 单候选修复,用于候选未通过 Schema/安全校验时。 */
  repair?(input: { request: GenerationRequest; candidate: unknown; reason: string; signal: AbortSignal }): Promise<unknown | null>;
}

export type { CookingMethod };
