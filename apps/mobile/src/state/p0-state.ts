import type {
  GenerationDraft,
  IngredientCategory,
  IngredientDefinition,
  SelectedIngredient,
} from '@ai-kitchen/shared';

import { normalizeIngredientText } from '../data/fixtures/ingredient-repository';

export interface RecentRecipeEntry {
  readonly recipeId: string;
  readonly viewedAt: string;
  readonly source: 'fixture';
}

export interface P0UiPreferences {
  readonly selectedCategory: IngredientCategory | 'all';
}

export interface P0State {
  readonly guestId: string;
  readonly selectedIngredients: readonly SelectedIngredient[];
  readonly generationDraft: GenerationDraft;
  readonly lastRecipeId: string | null;
  readonly recentRecipes: readonly RecentRecipeEntry[];
  readonly cookingSteps: Readonly<Record<string, number>>;
  readonly uiPreferences: P0UiPreferences;
}

export type AddCustomIngredientResult =
  | { readonly ok: true; readonly ingredient: SelectedIngredient }
  | {
      readonly ok: false;
      readonly reason:
        | 'EMPTY'
        | 'TOO_LONG'
        | 'CATALOG_DUPLICATE'
        | 'CUSTOM_DUPLICATE';
    };

const DEFAULT_DRAFT: GenerationDraft = {
  ingredientIds: [],
  customIngredients: [],
  servings: 2,
  maxTimeMinutes: 30,
  cookware: [],
};

/** Creates a session-only guest namespace; it is never an authenticated identity. */
export function createSessionGuestId(): string {
  return `session-guest:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

export function createInitialP0State(guestId = createSessionGuestId()): P0State {
  return {
    guestId,
    selectedIngredients: [],
    generationDraft: DEFAULT_DRAFT,
    lastRecipeId: null,
    recentRecipes: [],
    cookingSteps: {},
    uiPreferences: { selectedCategory: 'all' },
  };
}

export function createCustomIngredient(
  value: string,
  selectedIngredients: readonly SelectedIngredient[],
  catalog: readonly IngredientDefinition[],
): AddCustomIngredientResult {
  const displayName = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  const normalizedName = normalizeIngredientText(displayName);

  if (!normalizedName) {
    return { ok: false, reason: 'EMPTY' };
  }

  if (displayName.length > 30) {
    return { ok: false, reason: 'TOO_LONG' };
  }

  const isCatalogDuplicate = catalog.some((ingredient) =>
    [ingredient.displayName, ...ingredient.aliases].some(
      (candidate) => normalizeIngredientText(candidate) === normalizedName,
    ),
  );
  if (isCatalogDuplicate) {
    return { ok: false, reason: 'CATALOG_DUPLICATE' };
  }

  const isCustomDuplicate = selectedIngredients.some(
    (ingredient) =>
      ingredient.source === 'custom' &&
      normalizeIngredientText(ingredient.displayName) === normalizedName,
  );
  if (isCustomDuplicate) {
    return { ok: false, reason: 'CUSTOM_DUPLICATE' };
  }

  return {
    ok: true,
    ingredient: {
      id: `custom:${normalizedName}`,
      displayName,
      source: 'custom',
    },
  };
}
