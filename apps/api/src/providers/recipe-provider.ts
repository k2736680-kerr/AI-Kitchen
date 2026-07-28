import type { GenerationRequest } from '@ai-kitchen/shared';

export class ProviderTimeoutError extends Error {}
export class ProviderRateLimitError extends Error {
  public constructor(message: string, public readonly retryAfterSeconds?: number) { super(message); }
}
export class ProviderUnavailableError extends Error {}

export interface RecipeProvider {
  readonly name: string;
  readonly model: string;
  generate(request: GenerationRequest, signal: AbortSignal): Promise<unknown | null>;
  repair?(input: { request: GenerationRequest; candidate: unknown; reason: string; signal: AbortSignal }): Promise<unknown | null>;
}
