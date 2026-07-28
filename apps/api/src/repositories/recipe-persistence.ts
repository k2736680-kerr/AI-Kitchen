import type { GenerationApiRequest, GenerationApiResponse, HistoryEntry, HistoryVisitRequest, Recipe } from '@ai-kitchen/shared';

export type IdempotencyReservation =
  | { readonly kind: 'new' }
  | { readonly kind: 'replay'; readonly response: GenerationApiResponse }
  | { readonly kind: 'conflict' }
  | { readonly kind: 'in_progress' };

export interface HistoryPage {
  readonly items: readonly HistoryEntry[];
  readonly nextCursor: string | null;
}

export interface RecipePersistence {
  ping(): Promise<boolean>;
  reserveGeneration(input: { request: GenerationApiRequest; requestHash: string }): Promise<IdempotencyReservation>;
  completeGeneration(input: { request: GenerationApiRequest; requestHash: string; response: GenerationApiResponse; status: 'succeeded' | 'no_match'; durationMs: number }): Promise<void>;
  failGeneration(input: { request: GenerationApiRequest; requestHash: string; status: 'failed' | 'timeout' | 'service_unavailable' | 'rate_limited'; errorCode: string; durationMs: number }): Promise<void>;
  saveRecipeSuccess(input: { request: GenerationApiRequest; requestHash: string; response: Extract<GenerationApiResponse, { status: 'success' }>; recipe: Recipe; durationMs: number }): Promise<void>;
  getRecipe(recipeId: string): Promise<Recipe | null>;
  listHistory(guestId: string, limit: number, cursor?: string): Promise<HistoryPage>;
  visitHistory(request: HistoryVisitRequest): Promise<boolean>;
}
