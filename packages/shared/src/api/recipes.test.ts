import { describe, expect, it } from 'vitest';

import { RECIPE_FIXTURES } from '../fixtures/recipes';
import { HistoryListResponseSchema, HistoryVisitRequestSchema, RecipeApiResponseSchema } from './recipes';

describe('recipe and history API schema', () => {
  it('validates a persisted recipe response', () => {
    expect(RecipeApiResponseSchema.safeParse({ schemaVersion: 'v1', recipe: RECIPE_FIXTURES[0] }).success).toBe(true);
  });

  it('validates history snapshots and rejects unknown visit fields', () => {
    const entry = {
      recipe: RECIPE_FIXTURES[0],
      source: 'remote',
      firstVisitedAt: '2026-07-28T00:00:00.000Z',
      lastVisitedAt: '2026-07-28T00:00:00.000Z',
      visitCount: 1,
    };
    expect(HistoryListResponseSchema.safeParse({ schemaVersion: 'v1', items: [entry], nextCursor: null }).success).toBe(true);
    expect(HistoryVisitRequestSchema.safeParse({ guestId: 'session-guest-1234', recipeId: RECIPE_FIXTURES[0].recipeId, source: 'remote', extra: true }).success).toBe(false);
  });
});
