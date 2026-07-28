import type { AllergenCode, GenerationRequest } from '@ai-kitchen/shared';

import { fixtureIngredientRepository } from '../data/fixtures/ingredient-repository';
import type { P0State } from './p0-state';

export interface GenerationValidation {
  readonly canSubmit: boolean;
  readonly messages: readonly string[];
}

function selectedIngredientNames(state: P0State, ingredientIds: readonly string[]): string[] {
  return ingredientIds
    .map((id) => state.selectedIngredients.find((ingredient) => ingredient.id === id)?.displayName ?? id);
}

function selectedAllergenNames(allergens: readonly AllergenCode[]): string[] {
  const labels: Record<AllergenCode, string> = {
    'egg.chicken': '鸡蛋',
    'wheat.common': '小麦',
    'milk.cow': '牛奶',
    'nut.peanut': '花生',
    'shellfish.shrimp': '虾蟹贝类',
  };
  return allergens.map((allergen) => labels[allergen]);
}

export function validateGenerationRequest(state: P0State, request: GenerationRequest): GenerationValidation {
  const messages: string[] = [];
  if (state.selectedIngredients.length === 0) {
    messages.push('请先选择至少一种食材。');
  }

  const selectedAllergens = new Set(
    request.selectedIngredientIds.flatMap((ingredientId) =>
      fixtureIngredientRepository.getById(ingredientId)?.allergenCodes ?? [],
    ),
  );
  const conflictingAllergens = request.allergens.filter((allergen) => selectedAllergens.has(allergen));
  if (conflictingAllergens.length > 0) {
    messages.push(`已选食材包含你标记的过敏原：${selectedAllergenNames(conflictingAllergens).join('、')}，请移除冲突食材或调整过敏原。`);
  }

  const selectedIds = new Set(request.selectedIngredientIds);
  const conflictingExcluded = request.excludedIngredients.filter((ingredientId) => selectedIds.has(ingredientId));
  if (conflictingExcluded.length > 0) {
    messages.push(`已选食材与忌口冲突：${selectedIngredientNames(state, conflictingExcluded).join('、')}，请移除其中一项。`);
  }

  if (request.customIngredients.length > 0 && request.allergens.length > 0) {
    messages.push('自定义食材的过敏原信息无法确认，请移除自定义食材或先清除过敏原。');
  }

  return { canSubmit: messages.length === 0, messages };
}
