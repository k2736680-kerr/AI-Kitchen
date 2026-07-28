import { FIXTURE_ERRORS, type GenerationDraft } from '@ai-kitchen/shared';

import { fixtureRecipeRepository } from './recipe-repository';

export type FixtureGenerationScenario = 'success' | 'fail-once';
export interface FixtureGenerationRequest { readonly draft: GenerationDraft; readonly scenario?: FixtureGenerationScenario; readonly attempt: number }
export interface FixtureGenerationResult { readonly recipeId: string }

function hasAll(draft: GenerationDraft, ids: readonly string[]): boolean {
  return ids.every((id) => draft.ingredientIds.includes(id));
}

export function generateFixtureRecipe(request: FixtureGenerationRequest): Promise<FixtureGenerationResult> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (request.draft.ingredientIds.length === 0) { reject(FIXTURE_ERRORS.invalidRequest); return; }
      if (request.scenario === 'fail-once' && request.attempt === 1) { reject(FIXTURE_ERRORS.internalError); return; }
      const recipeId = hasAll(request.draft, ['tomato', 'egg', 'noodles'])
        ? 'fixture-tomato-egg-noodles'
        : hasAll(request.draft, ['onion', 'chicken-breast', 'rice'])
          ? 'fixture-onion-chicken-fried-rice'
          : 'fixture-potato-egg-missing-noodles';
      if (!fixtureRecipeRepository.getById(recipeId)) { reject(FIXTURE_ERRORS.notFound); return; }
      resolve({ recipeId });
    }, 900);
  });
}
