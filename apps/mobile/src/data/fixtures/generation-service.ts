import {
  FIXTURE_ERRORS,
  type GenerationRequest,
  type RecipeFixture,
} from '@ai-kitchen/shared';

import { fixtureRecipeRepository } from './recipe-repository';

export interface LocalGenerationRequest {
  readonly request: GenerationRequest;
}

export type LocalGenerationResult =
  | { readonly status: 'success'; readonly recipeId: string }
  | { readonly status: 'no-match'; readonly message: string };

function hasAllIngredients(request: GenerationRequest, recipe: RecipeFixture): boolean {
  return recipe.requiredIngredients.every((ingredient) =>
    request.selectedIngredientIds.includes(ingredient.ingredientId),
  );
}

function supportsCookware(request: GenerationRequest, recipe: RecipeFixture): boolean {
  if (request.availableTools.length === 0 || recipe.requiredCookware.length === 0) return true;
  return recipe.requiredCookware.some((cookware) => request.availableTools.includes(cookware));
}

function matchesPreferences(request: GenerationRequest, recipe: RecipeFixture): boolean {
  return request.dietaryPreferences.every((preference) => recipe.dietaryTags.includes(preference));
}

function avoidsAllergens(request: GenerationRequest, recipe: RecipeFixture): boolean {
  return request.allergens.every((allergen) => !recipe.allergenCodes.includes(allergen));
}

function avoidsExcludedIngredients(request: GenerationRequest, recipe: RecipeFixture): boolean {
  const recipeIngredientIds = [
    ...recipe.requiredIngredients,
    ...recipe.optionalIngredients,
    ...recipe.missingIngredients,
  ].map((ingredient) => ingredient.ingredientId);
  return request.excludedIngredients.every((ingredientId) => !recipeIngredientIds.includes(ingredientId));
}

function resolveRecipe(request: GenerationRequest): RecipeFixture | undefined {
  const ingredientMatches = fixtureRecipeRepository.listAll().filter((recipe) => hasAllIngredients(request, recipe));
  const timeMatches = ingredientMatches.filter((recipe) => recipe.totalTimeMinutes <= request.maxCookingTimeMinutes);
  const cookwareMatches = timeMatches.filter((recipe) => supportsCookware(request, recipe));
  const preferenceMatches = cookwareMatches.filter((recipe) => matchesPreferences(request, recipe));
  const allergenSafeMatches = preferenceMatches.filter((recipe) => avoidsAllergens(request, recipe));
  return allergenSafeMatches.find((recipe) => avoidsExcludedIngredients(request, recipe));
}

/** Local deterministic generation boundary. A future API repository can implement the same request/result contract. */
export function generateLocalRecipe(
  request: LocalGenerationRequest,
): Promise<LocalGenerationResult> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (request.request.selectedIngredientIds.length === 0 && request.request.customIngredients.length === 0) {
        resolve({ status: 'no-match', message: '还没有选择食材，请返回首页选择后再试。' });
        return;
      }

      const recipe = resolveRecipe(request.request);
      if (!recipe) {
        resolve({
          status: 'no-match',
          message: '没有找到同时满足当前食材、时间、厨具和安全条件的菜谱，请调整条件后重试。',
        });
        return;
      }

      if (!fixtureRecipeRepository.getById(recipe.recipeId)) {
        reject(FIXTURE_ERRORS.notFound);
        return;
      }

      resolve({ status: 'success', recipeId: recipe.recipeId });
    }, 700);
  });
}
