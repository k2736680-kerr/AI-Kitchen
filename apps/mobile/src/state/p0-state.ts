import type {
  ApiError,
  GenerationDraft,
  GenerationRequest,
  IngredientCategory,
  IngredientDefinition,
  SelectedIngredient,
  Recipe,
} from '@ai-kitchen/shared';

import { normalizeIngredientText } from '../data/fixtures/ingredient-repository';

export interface RecentRecipeEntry {
  readonly recipeId: string;
  readonly viewedAt: string;
  readonly source: 'fixture' | 'local' | 'remote';
}

export type GenerationSessionStatus =
  | 'idle'
  | 'generating'
  | 'succeeded'
  | 'no-match'
  | 'failed'
  | 'cancelled';

export interface GenerationSessionState {
  readonly status: GenerationSessionStatus;
  readonly requestId: string | null;
  readonly idempotencyKey: string | null;
  readonly recipeId: string | null;
  readonly error: ApiError | null;
  readonly message: string | null;
  readonly requestSnapshot: GenerationRequest | null;
  readonly source: 'local' | 'deterministic' | 'provider' | null;
}

export interface P0UiPreferences {
  readonly selectedCategory: IngredientCategory | 'all';
}

export type CookingSessionStatus = 'in-progress' | 'completed';

export interface CookingSessionState {
  readonly recipeId: string;
  readonly totalSteps: number;
  readonly currentStepIndex: number;
  readonly completedStepIndexes: readonly number[];
  readonly status: CookingSessionStatus;
}

export interface P0State {
  readonly guestId: string;
  readonly selectedIngredients: readonly SelectedIngredient[];
  readonly generationDraft: GenerationDraft;
  readonly generation: GenerationSessionState;
  readonly recipeCache: Readonly<Record<string, Recipe>>;
  readonly lastRecipeId: string | null;
  readonly recentRecipes: readonly RecentRecipeEntry[];
  readonly activeCookingRecipeId: string | null;
  readonly cookingSessions: Readonly<Record<string, CookingSessionState>>;
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
  selectedIngredientIds: [],
  customIngredients: [],
  servings: 2,
  maxCookingTimeMinutes: 30,
  availableTools: [],
  dietaryPreferences: [],
  allergens: [],
  excludedIngredients: [],
};

const INITIAL_GENERATION: GenerationSessionState = {
  status: 'idle',
  requestId: null,
  idempotencyKey: null,
  recipeId: null,
  error: null,
  message: null,
  requestSnapshot: null,
  source: null,
};

export function createGenerationRequest(state: P0State): GenerationRequest {
  return {
    schemaVersion: 'v1',
    selectedIngredientIds: [...state.generationDraft.selectedIngredientIds],
    customIngredients: state.generationDraft.customIngredients.map((ingredient) => ({ ...ingredient })),
    servings: state.generationDraft.servings,
    maxCookingTimeMinutes: state.generationDraft.maxCookingTimeMinutes,
    availableTools: [...state.generationDraft.availableTools],
    dietaryPreferences: [...state.generationDraft.dietaryPreferences],
    allergens: [...state.generationDraft.allergens],
    excludedIngredients: [...state.generationDraft.excludedIngredients],
  };
}

/** Creates a session-only guest namespace; it is never an authenticated identity. */
export function createSessionGuestId(): string {
  return `session-guest:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

export function createInitialP0State(guestId = createSessionGuestId()): P0State {
  return {
    guestId,
    selectedIngredients: [],
    generationDraft: DEFAULT_DRAFT,
    generation: INITIAL_GENERATION,
    recipeCache: {},
    lastRecipeId: null,
    recentRecipes: [],
    activeCookingRecipeId: null,
    cookingSessions: {},
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
    Object.values(ingredient.localization).flatMap((localized) => [localized.name, ...localized.aliases]).some(
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
