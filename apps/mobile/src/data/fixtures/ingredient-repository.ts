import { INGREDIENT_FIXTURES, type IngredientCategory, type IngredientDefinition, type IngredientLocale } from '@ai-kitchen/shared';

export interface IngredientRepository {
  listAll(): readonly IngredientDefinition[];
  listByCategory(category: IngredientCategory): readonly IngredientDefinition[];
  getById(id: string): IngredientDefinition | undefined;
  findByNameOrAlias(value: string): IngredientDefinition | undefined;
  search(query: string, category?: IngredientCategory, locale?: IngredientLocale): readonly IngredientDefinition[];
}

/** Normalizes user-entered display text without changing business identifiers. */
export function normalizeIngredientText(value: string): string { return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase(); }
function localizedSearchValues(ingredient: IngredientDefinition, locale: IngredientLocale): readonly string[] { const value = ingredient.localization[locale]; return [value.name, ...value.aliases]; }
function allSearchValues(ingredient: IngredientDefinition): readonly string[] { return ['zh-CN', 'en-US'].flatMap((locale) => localizedSearchValues(ingredient, locale as IngredientLocale)); }
function matchesIngredient(ingredient: IngredientDefinition, normalizedQuery: string, locale: IngredientLocale): boolean { return localizedSearchValues(ingredient, locale).some((value) => normalizeIngredientText(value).includes(normalizedQuery)); }

export const fixtureIngredientRepository: IngredientRepository = {
  listAll: () => INGREDIENT_FIXTURES,
  listByCategory: (category) => INGREDIENT_FIXTURES.filter((ingredient) => ingredient.category === category),
  getById: (id) => INGREDIENT_FIXTURES.find((ingredient) => ingredient.id === id),
  findByNameOrAlias: (value) => { const normalizedValue = normalizeIngredientText(value); return normalizedValue ? INGREDIENT_FIXTURES.find((ingredient) => allSearchValues(ingredient).some((candidate) => normalizeIngredientText(candidate) === normalizedValue)) : undefined; },
  search: (query, category, locale = 'zh-CN') => { const ingredients = category ? INGREDIENT_FIXTURES.filter((ingredient) => ingredient.category === category) : INGREDIENT_FIXTURES; const normalizedQuery = normalizeIngredientText(query); return normalizedQuery ? ingredients.filter((ingredient) => matchesIngredient(ingredient, normalizedQuery, locale)) : ingredients; },
};
