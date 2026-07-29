import type { GenerationApiRequest, GenerationApiResponse, HistoryEntry, HistoryVisitRequest, Recipe, SupportedLocale } from '@ai-kitchen/shared';

import type { HistoryPage, IdempotencyReservation, RecipePersistence } from '../repositories/recipe-persistence';

type StoredGeneration = { requestHash: string; status: string; response?: GenerationApiResponse };

export class InMemoryRecipePersistence implements RecipePersistence {
  private readonly generations = new Map<string, StoredGeneration>();
  private readonly recipes = new Map<string, Recipe>();
  private readonly history = new Map<string, HistoryEntry>();

  public async ping(): Promise<boolean> { return true; }

  public async reserveGeneration(input: { request: GenerationApiRequest; requestHash: string }): Promise<IdempotencyReservation> {
    const existing = this.generations.get(input.request.idempotencyKey);
    if (!existing) {
      this.generations.set(input.request.idempotencyKey, { requestHash: input.requestHash, status: 'processing' });
      return { kind: 'new' };
    }
    if (existing.requestHash !== input.requestHash) return { kind: 'conflict' };
    if (existing.status === 'processing') return { kind: 'in_progress' };
    return existing.response ? { kind: 'replay', response: existing.response } : { kind: 'conflict' };
  }

  public async completeGeneration(input: { request: GenerationApiRequest; requestHash: string; response: GenerationApiResponse; status: 'succeeded' | 'no_match'; durationMs: number }): Promise<void> {
    this.generations.set(input.request.idempotencyKey, { requestHash: input.requestHash, status: input.status, response: input.response });
  }

  public async failGeneration(input: { request: GenerationApiRequest; requestHash: string; status: 'failed' | 'timeout' | 'service_unavailable' | 'rate_limited'; errorCode: string; durationMs: number }): Promise<void> {
    this.generations.set(input.request.idempotencyKey, { requestHash: input.requestHash, status: input.status });
  }

  public async saveRecipeSuccess(input: { request: GenerationApiRequest; requestHash: string; response: Extract<GenerationApiResponse, { status: 'success' }>; recipe: Recipe; durationMs: number }): Promise<void> {
    this.recipes.set(input.recipe.recipeId, input.recipe);
    this.generations.set(input.request.idempotencyKey, { requestHash: input.requestHash, status: 'succeeded', response: input.response });
    await this.visitHistory({ guestId: input.request.identity.type === 'guest' ? input.request.identity.guestId : input.request.identity.userId, recipeId: input.recipe.recipeId, source: 'remote' });
  }

  public async getRecipe(recipeId: string): Promise<Recipe | null> { return this.recipes.get(recipeId) ?? null; }

  public async listHistory(guestId: string, locale: SupportedLocale, limit: number): Promise<HistoryPage> {
    const prefix = `${guestId}:`;
    const items = [...this.history.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, entry]) => entry)
      .filter((entry) => entry.recipe.locale === locale)
      .sort((left, right) => right.lastVisitedAt.localeCompare(left.lastVisitedAt))
      .slice(0, limit);
    return { items, nextCursor: null };
  }

  public async visitHistory(request: HistoryVisitRequest): Promise<boolean> {
    const recipe = this.recipes.get(request.recipeId);
    if (!recipe) return false;
    const key = `${request.guestId}:${request.recipeId}`;
    const existing = this.history.get(key);
    const now = new Date().toISOString();
    this.history.set(key, {
      recipe,
      source: request.source,
      firstVisitedAt: existing?.firstVisitedAt ?? now,
      lastVisitedAt: now,
      visitCount: (existing?.visitCount ?? 0) + 1,
    });
    return true;
  }
}
