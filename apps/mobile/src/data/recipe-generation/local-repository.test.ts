import { describe, expect, it } from 'vitest';

import { LocalRecipeGenerationRepository } from './local-repository';
import type { GenerationApiRequest } from '@ai-kitchen/shared';

const request: GenerationApiRequest = {
  schemaVersion: 'v1',
  requestId: 'req_mobile_local_1234',
  idempotencyKey: 'idem_mobile_local_1234',
  clientVersion: '1.0.0',
  identity: { type: 'guest', guestId: 'guest-mobile-test' },
  generationRequest: {
    schemaVersion: 'v1',
    locale: 'zh-CN',
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

describe('LocalRecipeGenerationRepository', () => {
  it('returns the standard success response', async () => {
    const result = await new LocalRecipeGenerationRepository().generate(request, new AbortController().signal);
    expect(result.status).toBe('success');
    if (result.status === 'success') expect(result.recipe.recipeId).toBe('fixture-tomato-egg-noodles');
  });

  it('keeps allergen filtering in the standard response boundary', async () => {
    const result = await new LocalRecipeGenerationRepository().generate({
      ...request,
      idempotencyKey: 'idem_mobile_local_allergen',
      generationRequest: { ...request.generationRequest, allergens: ['egg.chicken'] },
    }, new AbortController().signal);
    expect(result.status).toBe('no_match');
  });
});
