import { describe, expect, it } from 'vitest';

import {
  GenerationApiRequestSchema,
  GenerationApiResponseSchema,
} from './generation';
import { RECIPE_FIXTURES } from '../fixtures/recipes';

const validRequest = {
  schemaVersion: 'v1',
  requestId: 'req_1234567890abcdef',
  idempotencyKey: 'idem_1234567890abcdef',
  clientVersion: '1.0.0',
  identity: { type: 'guest', guestId: 'session-guest-test' },
  generationRequest: {
    schemaVersion: 'v1',
    selectedIngredientIds: ['egg', 'tomato', 'noodles'],
    customIngredients: [],
    servings: 2,
    maxCookingTimeMinutes: 30,
    availableTools: [],
    dietaryPreferences: [],
    allergens: [],
    excludedIngredients: [],
  },
};

describe('versioned generation API schema', () => {
  it('accepts the v1 request and rejects unknown fields', () => {
    expect(GenerationApiRequestSchema.safeParse(validRequest).success).toBe(true);
    expect(GenerationApiRequestSchema.safeParse({ ...validRequest, unexpected: true }).success).toBe(false);
  });

  it('rejects an unsupported request version', () => {
    expect(GenerationApiRequestSchema.safeParse({ ...validRequest, schemaVersion: 'v2' }).success).toBe(false);
  });

  it('validates the stable response discriminators', () => {
    const noMatch = {
      status: 'no_match',
      schemaVersion: 'v1',
      requestId: validRequest.requestId,
      message: '没有找到符合当前条件的菜谱。',
    };
    expect(GenerationApiResponseSchema.safeParse(noMatch).success).toBe(true);
    expect(GenerationApiResponseSchema.safeParse({ ...noMatch, status: 'provider_error' }).success).toBe(false);
  });

  it('validates a success response against the recipe output schema', () => {
    const response = {
      status: 'success',
      schemaVersion: 'v1',
      requestId: validRequest.requestId,
      recipe: RECIPE_FIXTURES[0],
      metadata: {
        source: 'deterministic',
        generatedAt: '2026-07-28T00:00:00.000Z',
        durationMs: 12,
        repaired: false,
        requestVersion: 'v1',
        recipeSchemaVersion: 'recipe.v1.0.0',
      },
    };
    expect(GenerationApiResponseSchema.safeParse(response).success).toBe(true);
  });
});
