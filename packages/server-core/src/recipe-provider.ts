import type { CookingMethod, GenerationRequest } from '@ai-kitchen/shared';

export class ProviderTimeoutError extends Error {}
export class ProviderRateLimitError extends Error {
  public constructor(message: string, public readonly retryAfterSeconds?: number) { super(message); }
}
export class ProviderUnavailableError extends Error {}

export interface RecipeProvider {
  readonly name: string;
  readonly model: string;
  generateBatch(request: GenerationRequest, signal: AbortSignal): Promise<ReadonlyArray<unknown | null>>;
  repair?(input: { request: GenerationRequest; candidate: unknown; reason: string; signal: AbortSignal }): Promise<unknown | null>;
}

export type { CookingMethod };
