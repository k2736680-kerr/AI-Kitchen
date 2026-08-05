import type {
  ApiError,
  GenerationDraft,
  GenerationRequest,
  IngredientCategory,
  IngredientDefinition,
  SelectedIngredient,
  Recipe,
  SupportedLocale,
} from '@ai-kitchen/shared';

import { normalizeIngredientText } from '../data/fixtures/ingredient-repository';

export interface RecentRecipeEntry {
  readonly recipeId: string;
  readonly viewedAt: string;
  readonly source: 'fixture' | 'local' | 'remote';
  readonly locale: SupportedLocale;
}

export type GenerationSessionStatus =
  | 'idle'
  | 'generating'
  | 'succeeded'
  | 'no-match'
  | 'failed'
  | 'cancelled';

export type GuestIdentityStatus = 'initializing' | 'ready' | 'error';

export interface GenerationSessionState {
  readonly status: GenerationSessionStatus;
  readonly requestId: string | null;
  readonly idempotencyKey: string | null;
  readonly recipeId: string | null;
  /** 一次多候选生成的所有菜谱 id(展示方案列表用),recipeId 为首个。 */
  readonly recipeIds: readonly string[];
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
  readonly guestId: string | null;
  readonly identityStatus: GuestIdentityStatus;
  readonly identityError: string | null;
  readonly selectedIngredients: readonly SelectedIngredient[];
  readonly generationDraft: GenerationDraft;
  readonly generation: GenerationSessionState;
  readonly recipeCache: Readonly<Record<string, Recipe>>;
  readonly lastRecipeId: string | null;
  readonly recentRecipes: readonly RecentRecipeEntry[];
  readonly favoriteRecipeIds: readonly string[];
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
  candidateCount: 4,
  excludedRecipes: [],
};

const INITIAL_GENERATION: GenerationSessionState = {
  status: 'idle',
  requestId: null,
  idempotencyKey: null,
  recipeId: null,
  recipeIds: [],
  error: null,
  message: null,
  requestSnapshot: null,
  source: null,
};

/**
 * 基于当前草稿构造生成请求。
 * @param excludedRecipes 「再来一批」时传入上一批的 title+cookingMethod,用于去重。
 */
export function createGenerationRequest(state: P0State, locale: SupportedLocale, excludedRecipes: GenerationRequest['excludedRecipes'] = []): GenerationRequest {
  return {
    schemaVersion: 'v1',
    locale,
    selectedIngredientIds: [...state.generationDraft.selectedIngredientIds],
    customIngredients: state.generationDraft.customIngredients.map((ingredient) => ({ ...ingredient })),
    servings: state.generationDraft.servings,
    maxCookingTimeMinutes: state.generationDraft.maxCookingTimeMinutes,
    availableTools: [...state.generationDraft.availableTools],
    dietaryPreferences: [...state.generationDraft.dietaryPreferences],
    allergens: [...state.generationDraft.allergens],
    excludedIngredients: [...state.generationDraft.excludedIngredients],
    candidateCount: state.generationDraft.candidateCount ?? 4,
    excludedRecipes,
  };
}

export function createInitialP0State(guestId: string | null = null): P0State {
  return {
    guestId,
    identityStatus: guestId ? 'ready' : 'initializing',
    identityError: null,
    selectedIngredients: [],
    generationDraft: DEFAULT_DRAFT,
    generation: INITIAL_GENERATION,
    recipeCache: {},
    lastRecipeId: null,
    recentRecipes: [],
    favoriteRecipeIds: [],
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
