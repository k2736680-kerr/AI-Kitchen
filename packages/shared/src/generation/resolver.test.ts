import { describe, expect, it } from 'vitest';

import { RECIPE_FIXTURES } from '../fixtures/recipes';
import { resolveDeterministicRecipe, validateGenerationInput } from './resolver';
import type { GenerationRequest } from './types';

const baseRequest: GenerationRequest = {
  schemaVersion: 'v1',
  selectedIngredientIds: ['egg', 'tomato', 'noodles'],
  customIngredients: [],
  servings: 2,
  maxCookingTimeMinutes: 30,
  availableTools: [],
  dietaryPreferences: [],
  allergens: [],
  excludedIngredients: [],
};

describe('deterministic generation resolver', () => {
  it('returns the matching recipe for the normal request', () => {
    const result = resolveDeterministicRecipe(baseRequest, RECIPE_FIXTURES);
    expect(result).toEqual({ status: 'success', recipe: RECIPE_FIXTURES[0] });
  });

  it('never returns a recipe containing a requested allergen', () => {
    const result = resolveDeterministicRecipe({ ...baseRequest, allergens: ['egg.chicken'] }, RECIPE_FIXTURES);
    expect(result.status).toBe('no_match');
  });

  it('blocks selected ingredient and exclusion conflicts before matching', () => {
    const request = { ...baseRequest, excludedIngredients: ['tomato'] };
    expect(validateGenerationInput(request)).toHaveLength(1);
    expect(resolveDeterministicRecipe(request, RECIPE_FIXTURES).status).toBe('no_match');
  });

  it('rejects unknown ingredient IDs', () => {
    const issues = validateGenerationInput({ ...baseRequest, selectedIngredientIds: ['unknown-food'] });
    expect(issues[0]?.code).toBe('UNKNOWN_INGREDIENT');
  });
});
