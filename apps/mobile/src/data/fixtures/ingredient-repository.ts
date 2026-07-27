import {
  INGREDIENT_FIXTURES,
  type IngredientCategory,
  type IngredientDefinition,
} from '@ai-kitchen/shared';

export interface IngredientRepository {
  listAll(): readonly IngredientDefinition[];
  listByCategory(category: IngredientCategory): readonly IngredientDefinition[];
  getById(id: string): IngredientDefinition | undefined;
  findByNameOrAlias(value: string): IngredientDefinition | undefined;
  search(
    query: string,
    category?: IngredientCategory,
  ): readonly IngredientDefinition[];
}

/** Lightweight display-text normalization for the P0 fixture catalog. */
export function normalizeIngredientText(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function matchesIngredient(
  ingredient: IngredientDefinition,
  normalizedQuery: string,
): boolean {
  return [ingredient.displayName, ...ingredient.aliases].some((value) =>
    normalizeIngredientText(value).includes(normalizedQuery),
  );
}

export const fixtureIngredientRepository: IngredientRepository = {
  listAll: () => INGREDIENT_FIXTURES,

  listByCategory: (category) =>
    INGREDIENT_FIXTURES.filter((ingredient) => ingredient.category === category),

  getById: (id) => INGREDIENT_FIXTURES.find((ingredient) => ingredient.id === id),

  findByNameOrAlias: (value) => {
    const normalizedValue = normalizeIngredientText(value);

    if (!normalizedValue) {
      return undefined;
    }

    return INGREDIENT_FIXTURES.find((ingredient) =>
      [ingredient.displayName, ...ingredient.aliases].some(
        (candidate) => normalizeIngredientText(candidate) === normalizedValue,
      ),
    );
  },

  search: (query, category) => {
    const ingredients = category
      ? INGREDIENT_FIXTURES.filter((ingredient) => ingredient.category === category)
      : INGREDIENT_FIXTURES;
    const normalizedQuery = normalizeIngredientText(query);

    return normalizedQuery
      ? ingredients.filter((ingredient) =>
          matchesIngredient(ingredient, normalizedQuery),
        )
      : ingredients;
  },
};
