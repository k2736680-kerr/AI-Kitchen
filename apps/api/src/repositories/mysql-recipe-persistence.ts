import {
  GenerationApiResponseSchema,
  RecipeSchema,
  type GenerationApiRequest,
  type GenerationApiResponse,
  type HistoryEntry,
  type HistoryVisitRequest,
  type Recipe,
} from '@ai-kitchen/shared';

import type { Database, SqlSession } from '../database/mysql-database';
import type { HistoryPage, IdempotencyReservation, RecipePersistence } from './recipe-persistence';

type GenerationRow = {
  request_id: string;
  request_hash: string;
  status: string;
  response_payload: unknown | null;
};

type RecipeRow = { recipe_payload: unknown };
type HistoryRow = {
  recipe_payload: unknown;
  source: 'local' | 'remote';
  first_visited_at: string | Date;
  last_visited_at: string | Date;
  visit_count: number;
  recipe_id: string;
};

type HistoryCursor = { readonly lastVisitedAt: string; readonly recipeId: string };

function jsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return undefined; }
}

function toIso(value: string | Date): string {
  return new Date(value).toISOString();
}

function encodeCursor(value: HistoryCursor): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeCursor(cursor: string | undefined): HistoryCursor | undefined {
  if (!cursor) return undefined;
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<HistoryCursor>;
    return typeof value.lastVisitedAt === 'string' && typeof value.recipeId === 'string' ? { lastVisitedAt: value.lastVisitedAt, recipeId: value.recipeId } : undefined;
  } catch {
    return undefined;
  }
}

function asReservation(row: GenerationRow, requestHash: string): IdempotencyReservation {
  if (row.request_hash !== requestHash) return { kind: 'conflict' };
  if (row.status === 'processing') return { kind: 'in_progress' };
  const response = GenerationApiResponseSchema.safeParse(jsonValue(row.response_payload));
  return response.success ? { kind: 'replay', response: response.data } : { kind: 'conflict' };
}

export class MySqlRecipePersistence implements RecipePersistence {
  public constructor(private readonly database: Database) {}

  public ping(): Promise<boolean> {
    return this.database.ping();
  }

  public async reserveGeneration(input: { request: GenerationApiRequest; requestHash: string }): Promise<IdempotencyReservation> {
    return this.database.transaction(async (session) => {
      const existing = await session.rows<GenerationRow>(
        'SELECT request_id, request_hash, status, response_payload FROM ai_kitchen_generation_requests WHERE idempotency_key = ? FOR UPDATE',
        [input.request.idempotencyKey],
      );
      if (existing[0]) return asReservation(existing[0], input.requestHash);
      const sameRequest = await session.rows<GenerationRow>(
        'SELECT request_id, request_hash, status, response_payload FROM ai_kitchen_generation_requests WHERE request_id = ? FOR UPDATE',
        [input.request.requestId],
      );
      if (sameRequest[0]) return asReservation(sameRequest[0], input.requestHash);
      try {
        await session.execute(
          `INSERT INTO ai_kitchen_generation_requests
            (request_id, idempotency_key, request_hash, guest_id, schema_version, client_version, locale, request_payload, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
          [
            input.request.requestId,
            input.request.idempotencyKey,
            input.requestHash,
            input.request.identity.type === 'guest' ? input.request.identity.guestId : input.request.identity.userId,
            input.request.schemaVersion,
            input.request.clientVersion,
            input.request.generationRequest.locale,
            JSON.stringify(input.request),
          ],
        );
      } catch (error) {
        const mysqlError = error as { code?: string };
        if (mysqlError.code !== 'ER_DUP_ENTRY') throw error;
        const raced = await session.rows<GenerationRow>(
          'SELECT request_id, request_hash, status, response_payload FROM ai_kitchen_generation_requests WHERE idempotency_key = ? OR request_id = ? FOR UPDATE',
          [input.request.idempotencyKey, input.request.requestId],
        );
        if (raced[0]) return asReservation(raced[0], input.requestHash);
        throw error;
      }
      return { kind: 'new' };
    });
  }

  public async completeGeneration(input: { request: GenerationApiRequest; requestHash: string; response: GenerationApiResponse; status: 'succeeded' | 'no_match'; durationMs: number }): Promise<void> {
    await this.database.execute(
      `UPDATE ai_kitchen_generation_requests
       SET status = ?, response_payload = ?, duration_ms = ?, completed_at = UTC_TIMESTAMP(3), error_code = NULL
       WHERE idempotency_key = ? AND request_hash = ?`,
      [input.status, JSON.stringify(input.response), input.durationMs, input.request.idempotencyKey, input.requestHash],
    );
  }

  public async failGeneration(input: { request: GenerationApiRequest; requestHash: string; status: 'failed' | 'timeout' | 'service_unavailable' | 'rate_limited'; errorCode: string; durationMs: number }): Promise<void> {
    await this.database.execute(
      `UPDATE ai_kitchen_generation_requests
       SET status = ?, error_code = ?, duration_ms = ?, completed_at = UTC_TIMESTAMP(3)
       WHERE idempotency_key = ? AND request_hash = ?`,
      [input.status, input.errorCode, input.durationMs, input.request.idempotencyKey, input.requestHash],
    );
  }

  public async saveRecipeSuccess(input: { request: GenerationApiRequest; requestHash: string; response: Extract<GenerationApiResponse, { status: 'success' }>; recipe: Recipe; durationMs: number }): Promise<void> {
    const guestId = input.request.identity.type === 'guest' ? input.request.identity.guestId : input.request.identity.userId;
    await this.database.transaction(async (session) => {
      await session.execute(
        `INSERT INTO ai_kitchen_recipes (recipe_id, schema_version, source, provider, model, title, locale, recipe_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE recipe_payload = VALUES(recipe_payload), source = VALUES(source), provider = VALUES(provider), model = VALUES(model), title = VALUES(title), locale = VALUES(locale), updated_at = UTC_TIMESTAMP(3)`,
        [input.recipe.recipeId, input.response.metadata.recipeSchemaVersion, input.response.metadata.source, input.response.metadata.provider ?? null, input.response.metadata.model ?? null, input.recipe.title, input.recipe.locale, JSON.stringify(input.recipe)],
      );
      await session.execute(
        `UPDATE ai_kitchen_generation_requests
         SET status = 'succeeded', response_payload = ?, duration_ms = ?, completed_at = UTC_TIMESTAMP(3), error_code = NULL
         WHERE idempotency_key = ? AND request_hash = ?`,
        [JSON.stringify(input.response), input.durationMs, input.request.idempotencyKey, input.requestHash],
      );
      await this.upsertHistory(session, { guestId, recipeId: input.recipe.recipeId, source: 'remote' });
    });
  }

  public async getRecipe(recipeId: string): Promise<Recipe | null> {
    const rows = await this.database.rows<RecipeRow>('SELECT recipe_payload FROM ai_kitchen_recipes WHERE recipe_id = ?', [recipeId]);
    const parsed = RecipeSchema.safeParse(jsonValue(rows[0]?.recipe_payload));
    return parsed.success ? parsed.data : null;
  }

  public async listHistory(guestId: string, locale: import('@ai-kitchen/shared').SupportedLocale, limit: number, cursor?: string): Promise<HistoryPage> {
    const decoded = decodeCursor(cursor);
    const values: unknown[] = [guestId, locale];
    let cursorSql = '';
    if (decoded) {
      cursorSql = ' AND (h.last_visited_at < ? OR (h.last_visited_at = ? AND h.recipe_id < ?))';
      values.push(decoded.lastVisitedAt, decoded.lastVisitedAt, decoded.recipeId);
    }
    values.push(limit + 1);
    const rows = await this.database.rows<HistoryRow>(
      `SELECT h.recipe_id, h.source, h.first_visited_at, h.last_visited_at, h.visit_count, r.recipe_payload
       FROM ai_kitchen_recipe_history h
       INNER JOIN ai_kitchen_recipes r ON r.recipe_id = h.recipe_id
       WHERE h.guest_id = ? AND r.locale = ?${cursorSql}
       ORDER BY h.last_visited_at DESC, h.recipe_id DESC LIMIT ?`,
      values,
    );
    const pageRows = rows.slice(0, limit);
    const items: HistoryEntry[] = pageRows.flatMap((row) => {
      const recipe = RecipeSchema.safeParse(jsonValue(row.recipe_payload));
      return recipe.success ? [{ recipe: recipe.data, source: row.source, firstVisitedAt: toIso(row.first_visited_at), lastVisitedAt: toIso(row.last_visited_at), visitCount: row.visit_count }] : [];
    });
    const last = pageRows.at(-1);
    return { items, nextCursor: rows.length > limit && last ? encodeCursor({ lastVisitedAt: toIso(last.last_visited_at), recipeId: last.recipe_id }) : null };
  }

  public async visitHistory(request: HistoryVisitRequest): Promise<boolean> {
    const recipes = await this.database.rows<{ recipe_id: string }>('SELECT recipe_id FROM ai_kitchen_recipes WHERE recipe_id = ?', [request.recipeId]);
    if (!recipes[0]) return false;
    await this.upsertHistory(this.database, request);
    return true;
  }

  private async upsertHistory(session: SqlSession, request: HistoryVisitRequest): Promise<void> {
    await session.execute(
      `INSERT INTO ai_kitchen_recipe_history (guest_id, recipe_id, source, first_visited_at, last_visited_at, visit_count)
       VALUES (?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), 1)
       ON DUPLICATE KEY UPDATE source = VALUES(source), last_visited_at = UTC_TIMESTAMP(3), visit_count = visit_count + 1`,
      [request.guestId, request.recipeId, request.source],
    );
  }
}
