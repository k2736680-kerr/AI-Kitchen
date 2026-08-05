import { describe, expect, it } from 'vitest';

import { RECIPE_FIXTURES } from '../fixtures/recipes';
import { resolveDeterministicRecipe, validateGenerationInput, validateRecipeAgainstRequest } from './resolver';
import type { GenerationRequest } from './types';

const baseRequest: GenerationRequest = {
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
  candidateCount: 4,
  excludedRecipes: [],
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

  it('treats condiments as pantry staples not requiring explicit selection', () => {
    const recipe = {
      ...RECIPE_FIXTURES[0],
      requiredIngredients: [
        { ingredientId: 'tomato', displayName: '番茄', amount: '2 个' },
        { ingredientId: 'egg', displayName: '鸡蛋', amount: '2 个' },
        { ingredientId: 'salt', displayName: '盐', amount: '适量' },
        { ingredientId: 'cooking-oil', displayName: '食用油', amount: '1 勺' },
      ],
    };
    const request = { ...baseRequest, selectedIngredientIds: ['egg', 'tomato'] };
    expect(validateRecipeAgainstRequest(request, recipe)).toHaveLength(0);
    expect(resolveDeterministicRecipe(request, [recipe]).status).toBe('success');
  });

  it('still rejects required main ingredients that are not selected', () => {
    const recipe = {
      ...RECIPE_FIXTURES[0],
      requiredIngredients: [
        { ingredientId: 'tomato', displayName: '番茄', amount: '2 个' },
        { ingredientId: 'egg', displayName: '鸡蛋', amount: '2 个' },
        { ingredientId: 'pork', displayName: '猪肉', amount: '100 克' },
      ],
    };
    const request = { ...baseRequest, selectedIngredientIds: ['egg', 'tomato'] };
    expect(validateRecipeAgainstRequest(request, recipe).map((issue) => issue.code)).toContain('REQUIRED_INGREDIENT_MISSING');
  });
});
