import { describe, expect, it } from 'vitest';
import { API_ERROR_CODES } from '../api/errors';
import { INGREDIENT_FIXTURES } from './ingredients';
import { FIXTURE_ERRORS } from './errors';
import { RECIPE_FIXTURES } from './recipes';

describe('P0 fixtures', () => {
  it('has unique ingredient IDs, names, and trimmed aliases', () => {
    expect(new Set(INGREDIENT_FIXTURES.map((item) => item.id)).size).toBe(INGREDIENT_FIXTURES.length);
    expect(new Set(INGREDIENT_FIXTURES.map((item) => item.displayName)).size).toBe(INGREDIENT_FIXTURES.length);
    expect(INGREDIENT_FIXTURES.every((item) => item.aliases.every((alias) => alias === alias.trim()))).toBe(true);
  });

  it('has valid recipe steps and ingredient references', () => {
    const ids = new Set(INGREDIENT_FIXTURES.map((item) => item.id));
    for (const recipe of RECIPE_FIXTURES) {
      expect(recipe.generationMode).toBe('fixture');
      expect(recipe.nutritionStatus).toBe('unavailable');
      expect(new Set(recipe.steps.map((step) => step.stepId)).size).toBe(recipe.steps.length);
      expect(recipe.steps.map((step) => step.order)).toEqual(recipe.steps.map((_, index) => index + 1));
      expect(recipe.steps.every((step) => step.ingredientRefs.every((id) => ids.has(id)))).toBe(true);
    }
  });

  it('has unique recipe IDs and a missing ingredient example', () => {
    expect(new Set(RECIPE_FIXTURES.map((recipe) => recipe.recipeId)).size).toBe(RECIPE_FIXTURES.length);
    expect(RECIPE_FIXTURES.some((recipe) => recipe.missingIngredients.length > 0)).toBe(true);
  });

  it('uses only existing public API error codes', () => {
    expect(Object.values(FIXTURE_ERRORS).every((error) => API_ERROR_CODES.includes(error.code))).toBe(true);
    expect(Object.values(FIXTURE_ERRORS).every((error) => !('stack' in error))).toBe(true);
  });

  it('contains the required P0 catalog and recipes', () => {
    expect(INGREDIENT_FIXTURES).toHaveLength(10);
    expect(RECIPE_FIXTURES.map((recipe) => recipe.recipeId)).toEqual([
      'fixture-tomato-egg-noodles',
      'fixture-onion-chicken-fried-rice',
      'fixture-potato-egg-missing-noodles',
    ]);
  });
});
