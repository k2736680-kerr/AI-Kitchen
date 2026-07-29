import type { AuthenticatedGenerationApiRequest, AuthenticatedHistoryVisitRequest, GenerationApiResponse, HistoryEntry, Recipe, SupportedLocale } from '@ai-kitchen/shared';

import type { HistoryPage, IdempotencyReservation, RecipePersistence } from '../repositories/recipe-persistence';

type StoredGeneration = { requestHash: string; status: string; response?: GenerationApiResponse };

export class InMemoryRecipePersistence implements RecipePersistence {
  private readonly generations = new Map<string, StoredGeneration>();
  private readonly recipes = new Map<string, Recipe>();
  private readonly history = new Map<string, HistoryEntry>();

  public async ping(): Promise<boolean> { return true; }

  public async reserveGeneration(input: { request: AuthenticatedGenerationApiRequest; requestHash: string }): Promise<IdempotencyReservation> {
    const existing = this.generations.get(input.request.idempotencyKey);
    if (!existing) {
      this.generations.set(input.request.idempotencyKey, { requestHash: input.requestHash, status: 'processing' });
      return { kind: 'new' };
    }
    if (existing.requestHash !== input.requestHash) return { kind: 'conflict' };
    if (existing.status === 'processing') return { kind: 'in_progress' };
    return existing.response ? { kind: 'replay', response: existing.response } : { kind: 'conflict' };
  }

  public async completeGeneration(input: { request: AuthenticatedGenerationApiRequest; requestHash: string; response: GenerationApiResponse; status: 'succeeded' | 'no_match'; durationMs: number }): Promise<void> {
    this.generations.set(input.request.idempotencyKey, { requestHash: input.requestHash, status: input.status, response: input.response });
  }

  public async failGeneration(input: { request: AuthenticatedGenerationApiRequest; requestHash: string; status: 'failed' | 'timeout' | 'service_unavailable' | 'rate_limited'; errorCode: string; durationMs: number }): Promise<void> {
    this.generations.set(input.request.idempotencyKey, { requestHash: input.requestHash, status: input.status });
  }

  public async saveRecipeSuccess(input: { request: AuthenticatedGenerationApiRequest; requestHash: string; response: Extract<GenerationApiResponse, { status: 'success' }>; recipe: Recipe; durationMs: number }): Promise<void> {
    this.recipes.set(input.recipe.recipeId, input.recipe);
    this.generations.set(input.request.idempotencyKey, { requestHash: input.requestHash, status: 'succeeded', response: input.response });
    this.upsertHistory({ guestId: input.request.identity.id, recipeId: input.recipe.recipeId, source: 'remote' });
  }

  public async getRecipe(recipeId: string, guestId: string): Promise<Recipe | null> {
    return [...this.history.entries()].some(([key, entry]) => key === `${guestId}:${recipeId}` && entry.recipe.recipeId === recipeId)
      ? this.recipes.get(recipeId) ?? null
      : null;
  }

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

  public async visitHistory(request: AuthenticatedHistoryVisitRequest): Promise<boolean> {
    const recipe = this.recipes.get(request.recipeId);
    const key = `${request.guestId}:${request.recipeId}`;
    if (!recipe || !this.history.has(key)) return false;
    this.upsertHistory(request);
    return true;
  }

  private upsertHistory(request: AuthenticatedHistoryVisitRequest): void {
    const recipe = this.recipes.get(request.recipeId);
    if (!recipe) return;
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
  }
}
