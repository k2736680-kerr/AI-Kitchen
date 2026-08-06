import type { SupabaseClient } from '@supabase/supabase-js';

import { GenerationApiResponseSchema, RecipeSchema } from './ai-kitchen-core.js';

type Reservation =
  | { readonly kind: 'new' }
  | { readonly kind: 'replay'; readonly response: unknown }
  | { readonly kind: 'conflict' }
  | { readonly kind: 'in_progress' };

type HistoryCursor = { readonly lastVisitedAt: string; readonly recipeId: string };

function encodeCursor(value: HistoryCursor): string {
  return btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function decodeCursor(cursor: string | undefined): HistoryCursor | undefined {
  if (!cursor) return undefined;
  try {
    const normalized = cursor.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(cursor.length / 4) * 4, '=');
    const value = JSON.parse(atob(normalized)) as Partial<HistoryCursor>;
    return typeof value.lastVisitedAt === 'string' && typeof value.recipeId === 'string'
      ? { lastVisitedAt: value.lastVisitedAt, recipeId: value.recipeId }
      : undefined;
  } catch {
    return undefined;
  }
}

function assertNoError(error: { message?: string } | null): void {
  if (error) throw new Error('SUPABASE_DATABASE_ERROR');
}

export class SupabaseRecipePersistence {
  public constructor(private readonly client: SupabaseClient) {}

  public async ping(): Promise<boolean> {
    const { error } = await this.client.from('ai_kitchen_recipes').select('recipe_id', { head: true, count: 'exact' }).limit(1);
    return !error;
  }

  public async reserveGeneration(input: { request: any; requestHash: string }): Promise<Reservation> {
    const { data, error } = await this.client.rpc('ai_kitchen_reserve_generation', {
      p_request_id: input.request.requestId,
      p_idempotency_key: input.request.idempotencyKey,
      p_request_hash: input.requestHash,
      p_schema_version: input.request.schemaVersion,
      p_client_version: input.request.clientVersion,
      p_locale: input.request.generationRequest.locale,
      p_request_payload: input.request,
    });
    assertNoError(error);
    const reservation = data as Reservation | null;
    if (!reservation || !['new', 'replay', 'conflict', 'in_progress'].includes(reservation.kind)) throw new Error('INVALID_RESERVATION');
    if (reservation.kind !== 'replay') return reservation;
    const response = GenerationApiResponseSchema.safeParse(reservation.response);
    return response.success ? { kind: 'replay', response: response.data } : { kind: 'conflict' };
  }

  public async completeGeneration(input: { request: any; requestHash: string; response: unknown; status: string; durationMs: number }): Promise<void> {
    const { error } = await this.client.rpc('ai_kitchen_complete_generation', {
      p_idempotency_key: input.request.idempotencyKey,
      p_request_hash: input.requestHash,
      p_status: input.status,
      p_response: input.response,
      p_duration_ms: input.durationMs,
    });
    assertNoError(error);
  }

  public async failGeneration(input: { request: any; requestHash: string; status: string; errorCode: string; durationMs: number }): Promise<void> {
    const { error } = await this.client.rpc('ai_kitchen_fail_generation', {
      p_idempotency_key: input.request.idempotencyKey,
      p_request_hash: input.requestHash,
      p_status: input.status,
      p_error_code: input.errorCode,
      p_duration_ms: input.durationMs,
    });
    assertNoError(error);
  }

  public async saveRecipeSuccess(input: { request: any; requestHash: string; response: any; recipes: readonly unknown[]; durationMs: number }): Promise<void> {
    const { error } = await this.client.rpc('ai_kitchen_save_recipe_success', {
      p_idempotency_key: input.request.idempotencyKey,
      p_request_hash: input.requestHash,
      p_response: input.response,
      p_recipes: input.recipes,
      p_duration_ms: input.durationMs,
    });
    assertNoError(error);
  }

  public async getRecipe(recipeId: string, _guestId: string): Promise<unknown | null> {
    const { data, error } = await this.client.rpc('ai_kitchen_get_recipe', { p_recipe_id: recipeId });
    assertNoError(error);
    const parsed = RecipeSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  }

  public async listHistory(_guestId: string, locale: string, limit: number, cursor?: string): Promise<{ items: unknown[]; nextCursor: string | null }> {
    const decoded = decodeCursor(cursor);
    const { data, error } = await this.client.rpc('ai_kitchen_list_history', {
      p_locale: locale,
      p_limit: limit + 1,
      p_cursor_time: decoded?.lastVisitedAt ?? null,
      p_cursor_recipe_id: decoded?.recipeId ?? null,
    });
    assertNoError(error);
    const rows = Array.isArray(data) ? data as Array<Record<string, unknown>> : [];
    const pageRows = rows.slice(0, limit);
    const items = pageRows.flatMap((row) => {
      const recipe = RecipeSchema.safeParse(row.recipe_payload);
      if (!recipe.success) return [];
      return [{
        recipe: recipe.data,
        source: row.source,
        firstVisitedAt: new Date(String(row.first_visited_at)).toISOString(),
        lastVisitedAt: new Date(String(row.last_visited_at)).toISOString(),
        visitCount: Number(row.visit_count),
      }];
    });
    const last = pageRows.at(-1);
    return {
      items,
      nextCursor: rows.length > limit && last
        ? encodeCursor({ lastVisitedAt: new Date(String(last.last_visited_at)).toISOString(), recipeId: String(last.recipe_id) })
        : null,
    };
  }

  public async visitHistory(request: { recipeId: string; source: string }): Promise<boolean> {
    const { data, error } = await this.client.rpc('ai_kitchen_visit_history', { p_recipe_id: request.recipeId, p_source: request.source });
    assertNoError(error);
    return data === true;
  }
}
