import {
  FIXTURE_ERRORS,
  resolveDeterministicRecipes,
  type GenerationRequest,
} from '@ai-kitchen/shared';

import { fixtureRecipeRepository } from './recipe-repository';

export interface LocalGenerationRequest {
  readonly request: GenerationRequest;
  readonly signal?: AbortSignal;
}

export type LocalGenerationResult =
  | { readonly status: 'success'; readonly recipeIds: readonly string[] }
  | { readonly status: 'no-match'; readonly message: string };

/** Local deterministic generation boundary. The same request is used by the remote contract. */
export function generateLocalRecipe(
  request: LocalGenerationRequest,
): Promise<LocalGenerationResult> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      if (request.signal?.aborted) {
        reject(new DOMException('Generation cancelled', 'AbortError'));
        return;
      }

      const result = resolveDeterministicRecipes(request.request, fixtureRecipeRepository.listAll());
      if (result.status === 'no_match') {
        resolve({
          status: 'no-match',
          message: result.reason === 'NO_INGREDIENTS'
            ? '还没有选择食材，请返回首页选择后再试。'
            : '没有找到同时满足当前食材、时间、厨具和安全条件的菜谱，请调整条件后重试。',
        });
        return;
      }

      if (!result.recipes.every((recipe) => fixtureRecipeRepository.getById(recipe.recipeId))) {
        reject(FIXTURE_ERRORS.notFound);
        return;
      }
      resolve({ status: 'success', recipeIds: result.recipes.map((recipe) => recipe.recipeId) });
    };

    const timer = setTimeout(finish, 700);
    request.signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Generation cancelled', 'AbortError'));
    }, { once: true });
  });
}
