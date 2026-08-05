import { INGREDIENT_FIXTURES } from '../fixtures/ingredients';
import type { Recipe } from '../recipes/types';
import type { GenerationRequest } from './types';

export type GenerationValidationIssue = {
  readonly code: 'UNKNOWN_INGREDIENT' | 'INGREDIENT_ALLERGEN_CONFLICT' | 'INGREDIENT_EXCLUSION_CONFLICT' | 'EMPTY_INGREDIENTS';
  readonly message: string;
  readonly field?: string;
};

export type RecipeSafetyIssue = {
  readonly code: 'TIME_LIMIT' | 'COOKWARE_UNAVAILABLE' | 'DIETARY_PREFERENCE_CONFLICT' | 'ALLERGEN_CONFLICT' | 'EXCLUDED_INGREDIENT_CONFLICT' | 'REQUIRED_INGREDIENT_MISSING';
  readonly message: string;
};

export type DeterministicGenerationResult =
  | { readonly status: 'success'; readonly recipe: Recipe }
  | { readonly status: 'no_match'; readonly reason: 'NO_INGREDIENTS' | 'NO_SAFE_MATCH' };

const ingredientById = new Map(INGREDIENT_FIXTURES.map((ingredient) => [ingredient.id, ingredient]));

/** 调料/香料类食材视为厨房常备,无需用户显式选择即可出现在菜谱中。 */
export function isCondimentIngredient(ingredientId: string): boolean {
  return ingredientById.get(ingredientId)?.isCondiment === true;
}

function recipeIngredientIds(recipe: Recipe): readonly string[] {
  return [
    ...recipe.requiredIngredients,
    ...recipe.optionalIngredients,
    ...recipe.missingIngredients,
  ].map((ingredient) => ingredient.ingredientId);
}

/** requiredIngredients 中非调料的食材必须来自用户已选;调料类豁免。 */
function missingRequiredIngredients(request: GenerationRequest, recipe: Recipe): readonly string[] {
  return recipe.requiredIngredients
    .map((ingredient) => ingredient.ingredientId)
    .filter((ingredientId) => !request.selectedIngredientIds.includes(ingredientId) && !isCondimentIngredient(ingredientId));
}

export function validateGenerationInput(request: GenerationRequest): readonly GenerationValidationIssue[] {
  const issues: GenerationValidationIssue[] = [];
  if (request.selectedIngredientIds.length === 0 && request.customIngredients.length === 0) {
    issues.push({ code: 'EMPTY_INGREDIENTS', message: '至少选择一种食材后才能生成菜谱。', field: 'generationRequest.selectedIngredientIds' });
  }

  const allKnownIngredientIds = new Set(INGREDIENT_FIXTURES.map((ingredient) => ingredient.id));
  const unknownIds = [...request.selectedIngredientIds, ...request.excludedIngredients]
    .filter((ingredientId) => !allKnownIngredientIds.has(ingredientId));
  if (unknownIds.length > 0) {
    issues.push({ code: 'UNKNOWN_INGREDIENT', message: '包含暂不支持的食材，请重新选择。', field: 'generationRequest.selectedIngredientIds' });
  }

  if (request.customIngredients.some((ingredient) => ingredient.source !== 'custom' || !ingredient.id.startsWith('custom:'))) {
    issues.push({ code: 'UNKNOWN_INGREDIENT', message: '包含无法识别的自定义食材，请重新输入。', field: 'generationRequest.customIngredients' });
  }

  const selectedAllergens = new Set(
    request.selectedIngredientIds.flatMap((ingredientId) => ingredientById.get(ingredientId)?.allergenCodes ?? []),
  );
  if (request.allergens.some((allergen) => selectedAllergens.has(allergen))) {
    issues.push({ code: 'INGREDIENT_ALLERGEN_CONFLICT', message: '已选食材与过敏原限制冲突，不能继续生成。', field: 'generationRequest.allergens' });
  }

  if (request.excludedIngredients.some((ingredientId) => request.selectedIngredientIds.includes(ingredientId))) {
    issues.push({ code: 'INGREDIENT_EXCLUSION_CONFLICT', message: '已选食材与忌口食材冲突，不能继续生成。', field: 'generationRequest.excludedIngredients' });
  }

  return issues;
}

export function validateRecipeAgainstRequest(request: GenerationRequest, recipe: Recipe): readonly RecipeSafetyIssue[] {
  const issues: RecipeSafetyIssue[] = [];
  if (recipe.totalTimeMinutes > request.maxCookingTimeMinutes) {
    issues.push({ code: 'TIME_LIMIT', message: '菜谱超过用户设置的最长烹饪时间。' });
  }
  if (request.availableTools.length > 0 && recipe.requiredCookware.length > 0 && !recipe.requiredCookware.some((tool) => request.availableTools.includes(tool))) {
    issues.push({ code: 'COOKWARE_UNAVAILABLE', message: '菜谱需要未选择的关键厨具。' });
  }
  if (request.dietaryPreferences.some((preference) => !recipe.dietaryTags.includes(preference))) {
    issues.push({ code: 'DIETARY_PREFERENCE_CONFLICT', message: '菜谱不符合当前饮食偏好。' });
  }
  const mappedRecipeAllergens = new Set(recipeIngredientIds(recipe).flatMap((ingredientId) => ingredientById.get(ingredientId)?.allergenCodes ?? []));
  if (request.allergens.some((allergen) => recipe.allergenCodes.includes(allergen) || mappedRecipeAllergens.has(allergen))) {
    issues.push({ code: 'ALLERGEN_CONFLICT', message: '菜谱包含用户标记的过敏原。' });
  }
  const recipeIds = recipeIngredientIds(recipe);
  if (request.excludedIngredients.some((ingredientId) => recipeIds.includes(ingredientId))) {
    issues.push({ code: 'EXCLUDED_INGREDIENT_CONFLICT', message: '菜谱包含用户标记的忌口食材。' });
  }
  if (missingRequiredIngredients(request, recipe).length > 0) {
    issues.push({ code: 'REQUIRED_INGREDIENT_MISSING', message: '菜谱包含用户未提供的必要食材。' });
  }
  return issues;
}

export function resolveDeterministicRecipe(
  request: GenerationRequest,
  recipes: readonly Recipe[],
): DeterministicGenerationResult {
  if (request.selectedIngredientIds.length === 0 && request.customIngredients.length === 0) {
    return { status: 'no_match', reason: 'NO_INGREDIENTS' };
  }

  const inputIssues = validateGenerationInput(request);
  if (inputIssues.length > 0) return { status: 'no_match', reason: 'NO_SAFE_MATCH' };

  const ingredientMatches = recipes.filter((recipe) => {
    const required = recipe.requiredIngredients.map((ingredient) => ingredient.ingredientId);
    return required.every((ingredientId) => request.selectedIngredientIds.includes(ingredientId) || isCondimentIngredient(ingredientId));
  });
  const timeMatches = ingredientMatches.filter((recipe) => recipe.totalTimeMinutes <= request.maxCookingTimeMinutes);
  const cookwareMatches = timeMatches.filter((recipe) => validateRecipeAgainstRequest(request, recipe).every((issue) => issue.code !== 'COOKWARE_UNAVAILABLE'));
  const preferenceMatches = cookwareMatches.filter((recipe) => validateRecipeAgainstRequest(request, recipe).every((issue) => issue.code !== 'DIETARY_PREFERENCE_CONFLICT'));
  const allergenSafeMatches = preferenceMatches.filter((recipe) => validateRecipeAgainstRequest(request, recipe).every((issue) => issue.code !== 'ALLERGEN_CONFLICT'));
  const safeRecipe = allergenSafeMatches.find((recipe) => validateRecipeAgainstRequest(request, recipe).length === 0);
  return safeRecipe ? { status: 'success', recipe: safeRecipe } : { status: 'no_match', reason: 'NO_SAFE_MATCH' };
}

export type DeterministicRecipesResult =
  | { readonly status: 'success'; readonly recipes: readonly Recipe[] }
  | { readonly status: 'no_match'; readonly reason: 'NO_INGREDIENTS' | 'NO_SAFE_MATCH' };

/** 多候选版:返回所有通过安全校验的匹配菜谱(上限 candidateCount,不足则返回全部)。 */
export function resolveDeterministicRecipes(
  request: GenerationRequest,
  recipes: readonly Recipe[],
): DeterministicRecipesResult {
  if (request.selectedIngredientIds.length === 0 && request.customIngredients.length === 0) {
    return { status: 'no_match', reason: 'NO_INGREDIENTS' };
  }

  const inputIssues = validateGenerationInput(request);
  if (inputIssues.length > 0) return { status: 'no_match', reason: 'NO_SAFE_MATCH' };

  const ingredientMatches = recipes.filter((recipe) => {
    const required = recipe.requiredIngredients.map((ingredient) => ingredient.ingredientId);
    return required.every((ingredientId) => request.selectedIngredientIds.includes(ingredientId) || isCondimentIngredient(ingredientId));
  });
  const timeMatches = ingredientMatches.filter((recipe) => recipe.totalTimeMinutes <= request.maxCookingTimeMinutes);
  const safeMatches = timeMatches.filter((recipe) => validateRecipeAgainstRequest(request, recipe).length === 0);
  if (safeMatches.length === 0) return { status: 'no_match', reason: 'NO_SAFE_MATCH' };
  return { status: 'success', recipes: safeMatches.slice(0, request.candidateCount) };
}
