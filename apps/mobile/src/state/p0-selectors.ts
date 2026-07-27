import type { P0State } from './p0-state';

export function selectCanGenerate(state: P0State): boolean {
  return state.selectedIngredients.length > 0;
}

export function selectSelectedIngredientCount(state: P0State): number {
  return state.selectedIngredients.length;
}

export function selectRecentRecipeIds(state: P0State): readonly string[] {
  return state.recentRecipes.map((entry) => entry.recipeId);
}

export function selectCookingStep(state: P0State, recipeId: string): number {
  return state.cookingSteps[recipeId] ?? 0;
}
