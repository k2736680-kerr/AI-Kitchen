import { RECIPE_FIXTURES, type RecipeFixture } from '@ai-kitchen/shared';

export interface RecipeRepository {
  listAll(): readonly RecipeFixture[];
  getById(recipeId: string): RecipeFixture | undefined;
}

export const fixtureRecipeRepository: RecipeRepository = {
  listAll: () => RECIPE_FIXTURES,
  getById: (recipeId) =>
    RECIPE_FIXTURES.find((recipe) => recipe.recipeId === recipeId),
};
