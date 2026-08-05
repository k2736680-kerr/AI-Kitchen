import { describe, expect, it } from 'vitest';
import { RECIPE_FIXTURES } from '@ai-kitchen/shared';

import { p0Reducer } from './p0-reducer';
import { createInitialP0State } from './p0-state';

const tomato = { id: 'tomato', displayName: '番茄', source: 'catalog' as const };

describe('catalog ingredient selection', () => {
  it('adds an ingredient on the first tap and removes it on the second tap', () => {
    const initialState = createInitialP0State();
    const selectedState = p0Reducer(initialState, {
      type: 'TOGGLE_CATALOG_INGREDIENT',
      ingredient: tomato,
    });

    expect(selectedState.selectedIngredients).toEqual([tomato]);
    expect(selectedState.generationDraft.selectedIngredientIds).toEqual(['tomato']);

    const removedState = p0Reducer(selectedState, {
      type: 'TOGGLE_CATALOG_INGREDIENT',
      ingredient: tomato,
    });

    expect(removedState.selectedIngredients).toEqual([]);
    expect(removedState.generationDraft.selectedIngredientIds).toEqual([]);
  });
});

describe('multi-candidate generation', () => {
  it('stores all recipes in the cache and records their ids in order', () => {
    const initialState = createInitialP0State();
    const state = p0Reducer(initialState, {
      type: 'SET_GENERATION_SUCCEEDED',
      recipes: [RECIPE_FIXTURES[0], RECIPE_FIXTURES[1]],
      source: 'provider',
    });

    expect(state.generation.status).toBe('succeeded');
    expect(state.generation.recipeId).toBe(RECIPE_FIXTURES[0].recipeId);
    expect(state.generation.recipeIds).toEqual([RECIPE_FIXTURES[0].recipeId, RECIPE_FIXTURES[1].recipeId]);
    expect(state.recipeCache[RECIPE_FIXTURES[1].recipeId]).toEqual(RECIPE_FIXTURES[1]);
  });

  it('resets recipe ids when a generation fails', () => {
    const succeeded = p0Reducer(createInitialP0State(), {
      type: 'SET_GENERATION_SUCCEEDED',
      recipes: [RECIPE_FIXTURES[0]],
      source: 'provider',
    });
    const failed = p0Reducer(succeeded, { type: 'SET_GENERATION_FAILED', error: { code: 'INTERNAL_ERROR', message: 'failed' } });
    expect(failed.generation.recipeIds).toEqual([]);
  });
});

describe('favorites', () => {
  it('toggles a recipe id in the favorites list', () => {
    const initialState = createInitialP0State();
    const added = p0Reducer(initialState, { type: 'TOGGLE_FAVORITE_RECIPE', recipeId: 'recipe-1' });
    expect(added.favoriteRecipeIds).toEqual(['recipe-1']);
    const removed = p0Reducer(added, { type: 'TOGGLE_FAVORITE_RECIPE', recipeId: 'recipe-1' });
    expect(removed.favoriteRecipeIds).toEqual([]);
  });
});
