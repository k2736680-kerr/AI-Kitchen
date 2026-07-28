import {
  FIXTURE_ERRORS,
  type Cookware,
  type GenerationDraft,
  type RecipeFixture,
} from '@ai-kitchen/shared';

import { fixtureRecipeRepository } from './recipe-repository';

export interface LocalGenerationRequest {
  readonly draft: GenerationDraft;
}

export type LocalGenerationResult =
  | { readonly status: 'success'; readonly recipeId: string }
  | { readonly status: 'no-match'; readonly message: string };

const recipeCookware: Readonly<Record<string, readonly Cookware[]>> = {
  'fixture-tomato-egg-noodles': ['frying-pan', 'pot'],
  'fixture-onion-chicken-fried-rice': ['frying-pan', 'rice-cooker'],
  'fixture-potato-egg-missing-noodles': ['frying-pan', 'pot'],
};

function hasAllIngredients(draft: GenerationDraft, recipe: RecipeFixture): boolean {
  return recipe.requiredIngredients.every((ingredient) =>
    draft.ingredientIds.includes(ingredient.ingredientId),
  );
}

function supportsCookware(draft: GenerationDraft, recipe: RecipeFixture): boolean {
  if (draft.cookware.length === 0) return true;
  const supported = recipeCookware[recipe.recipeId] ?? [];
  return draft.cookware.some((cookware) => supported.includes(cookware));
}

function resolveRecipe(draft: GenerationDraft): RecipeFixture | undefined {
  return fixtureRecipeRepository.listAll().find(
    (recipe) =>
      hasAllIngredients(draft, recipe) &&
      recipe.totalTimeMinutes <= draft.maxTimeMinutes &&
      supportsCookware(draft, recipe),
  );
}

/**
 * Local generation boundary. The delay models an async data source; matching
 * remains deterministic and can later be replaced by an API repository.
 */
export function generateLocalRecipe(
  request: LocalGenerationRequest,
): Promise<LocalGenerationResult> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (request.draft.ingredientIds.length === 0 && request.draft.customIngredients.length === 0) {
        resolve({ status: 'no-match', message: '还没有选择食材，请返回首页选择后再试。' });
        return;
      }

      const recipe = resolveRecipe(request.draft);
      if (!recipe) {
        resolve({
          status: 'no-match',
          message: '没有找到同时满足当前食材、时间和厨具条件的菜谱。请调整条件后重试。',
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
