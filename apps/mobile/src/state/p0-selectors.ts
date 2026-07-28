import type { CookingSessionState, P0State } from './p0-state';
import { createGenerationRequest } from './p0-state';
import { validateGenerationRequest, type GenerationValidation } from './generation-validation';

export interface CookingProgress {
  readonly completed: number;
  readonly total: number;
  readonly ratio: number;
}

export function selectCanGenerate(state: P0State): boolean {
  return selectGenerationValidation(state).canSubmit;
}

export function selectGenerationValidation(state: P0State): GenerationValidation {
  return validateGenerationRequest(state, createGenerationRequest(state));
}

export function selectSelectedIngredientCount(state: P0State): number {
  return state.selectedIngredients.length;
}

export function selectRecentRecipeIds(state: P0State): readonly string[] {
  return state.recentRecipes.map((entry) => entry.recipeId);
}

export function selectActiveCookingRecipeId(state: P0State): string | null {
  return state.activeCookingRecipeId;
}

export function selectCookingSession(state: P0State, recipeId: string): CookingSessionState | undefined {
  return state.cookingSessions[recipeId];
}

export function selectCookingCurrentStep(state: P0State, recipeId: string): number {
  return state.cookingSessions[recipeId]?.currentStepIndex ?? 0;
}

export function selectCookingCompletedStepIndexes(state: P0State, recipeId: string): readonly number[] {
  return state.cookingSessions[recipeId]?.completedStepIndexes ?? [];
}

export function selectCookingCompletedCount(state: P0State, recipeId: string): number {
  return selectCookingCompletedStepIndexes(state, recipeId).length;
}

export function selectCookingIsComplete(state: P0State, recipeId: string): boolean {
  return state.cookingSessions[recipeId]?.status === 'completed';
}

export function selectCookingProgress(state: P0State, recipeId: string): CookingProgress {
  const session = state.cookingSessions[recipeId];
  const total = session?.totalSteps ?? 0;
  const completed = session?.completedStepIndexes.length ?? 0;
  return { completed, total, ratio: total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0 };
}
