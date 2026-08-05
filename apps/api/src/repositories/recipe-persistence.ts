import type { AuthenticatedGenerationApiRequest, AuthenticatedHistoryVisitRequest, GenerationApiResponse, HistoryEntry, Recipe, SupportedLocale } from '@ai-kitchen/shared';

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
  reserveGeneration(input: { request: AuthenticatedGenerationApiRequest; requestHash: string }): Promise<IdempotencyReservation>;
  completeGeneration(input: { request: AuthenticatedGenerationApiRequest; requestHash: string; response: GenerationApiResponse; status: 'succeeded' | 'no_match'; durationMs: number }): Promise<void>;
  failGeneration(input: { request: AuthenticatedGenerationApiRequest; requestHash: string; status: 'failed' | 'timeout' | 'service_unavailable' | 'rate_limited'; errorCode: string; durationMs: number }): Promise<void>;
  /** 保存一次成功生成的全部候选菜谱(事务内逐条 upsert)。 */
  saveRecipeSuccess(input: { request: AuthenticatedGenerationApiRequest; requestHash: string; response: Extract<GenerationApiResponse, { status: 'success' }>; recipes: readonly Recipe[]; durationMs: number }): Promise<void>;
  getRecipe(recipeId: string, guestId: string): Promise<Recipe | null>;
  listHistory(guestId: string, locale: SupportedLocale, limit: number, cursor?: string): Promise<HistoryPage>;
  visitHistory(request: AuthenticatedHistoryVisitRequest): Promise<boolean>;
}
