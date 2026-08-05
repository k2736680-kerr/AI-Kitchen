import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GenerationRequest, Recipe } from '@ai-kitchen/shared';

import type { CookingSessionState, P0State, P0UiPreferences, RecentRecipeEntry } from './p0-state';

const STORAGE_KEY = 'ai-kitchen.p0-state.v1';
const MAX_RECIPE_CACHE = 50;
const MAX_RECENT_RECIPES = 10;
const MAX_COOKING_SESSIONS = 8;

/** 落盘的最小状态子集;transient(generation/identityStatus)不入库。 */
interface PersistedP0State {
  readonly version: 1;
  readonly guestId: string | null;
  readonly selectedIngredients: P0State['selectedIngredients'];
  readonly generationDraft: GenerationDraftPersisted;
  readonly recipeCache: Readonly<Record<string, Recipe>>;
  readonly lastRecipeId: string | null;
  readonly recentRecipes: readonly RecentRecipeEntry[];
  readonly favoriteRecipeIds: readonly string[];
  readonly activeCookingRecipeId: string | null;
  readonly cookingSessions: Readonly<Record<string, CookingSessionState>>;
  readonly uiPreferences: P0UiPreferences;
}

type GenerationDraftPersisted = P0State['generationDraft'];

export function serializeP0State(state: P0State): string {
  const persisted: PersistedP0State = {
    version: 1,
    guestId: state.guestId,
    selectedIngredients: state.selectedIngredients,
    generationDraft: state.generationDraft,
    recipeCache: trimEntries(state.recipeCache, MAX_RECIPE_CACHE),
    lastRecipeId: state.lastRecipeId,
    recentRecipes: state.recentRecipes.slice(0, MAX_RECENT_RECIPES),
    favoriteRecipeIds: state.favoriteRecipeIds,
    activeCookingRecipeId: state.activeCookingRecipeId,
    cookingSessions: trimEntries(state.cookingSessions, MAX_COOKING_SESSIONS),
    uiPreferences: state.uiPreferences,
  };
  return JSON.stringify(persisted);
}

/** 从持久化数据恢复状态;identity/generation 等 transient 字段重建为初始值。 */
export function deserializeP0State(raw: string, guestId: string | null): Partial<P0State> {
  try {
    const persisted = JSON.parse(raw) as Partial<PersistedP0State>;
    if (persisted.version !== 1) return {};
    const patch: Partial<P0State> = {
      guestId,
      selectedIngredients: Array.isArray(persisted.selectedIngredients) ? persisted.selectedIngredients : [],
      generationDraft: normalizeDraft(persisted.generationDraft),
      recipeCache: isRecord(persisted.recipeCache) ? trimEntries(persisted.recipeCache, MAX_RECIPE_CACHE) : {},
      lastRecipeId: typeof persisted.lastRecipeId === 'string' ? persisted.lastRecipeId : null,
      recentRecipes: Array.isArray(persisted.recentRecipes) ? persisted.recentRecipes.slice(0, MAX_RECENT_RECIPES) : [],
      favoriteRecipeIds: Array.isArray(persisted.favoriteRecipeIds) ? persisted.favoriteRecipeIds : [],
      activeCookingRecipeId: typeof persisted.activeCookingRecipeId === 'string' ? persisted.activeCookingRecipeId : null,
      cookingSessions: isRecord(persisted.cookingSessions) ? trimEntries(persisted.cookingSessions, MAX_COOKING_SESSIONS) : {},
      uiPreferences: persisted.uiPreferences ?? { selectedCategory: 'all' },
    };
    return patch;
  } catch {
    return {};
  }
}

export async function loadPersistedP0State(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function savePersistedP0State(value: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, value);
}

export async function clearPersistedP0State(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

function normalizeDraft(draft: unknown): GenerationDraftPersisted {
  const value = (typeof draft === 'object' && draft !== null ? draft : {}) as Partial<GenerationDraftPersisted>;
  return {
    selectedIngredientIds: Array.isArray(value.selectedIngredientIds) ? value.selectedIngredientIds : [],
    customIngredients: Array.isArray(value.customIngredients) ? value.customIngredients : [],
    servings: value.servings ?? 2,
    maxCookingTimeMinutes: value.maxCookingTimeMinutes ?? 30,
    availableTools: Array.isArray(value.availableTools) ? value.availableTools : [],
    dietaryPreferences: Array.isArray(value.dietaryPreferences) ? value.dietaryPreferences : [],
    allergens: Array.isArray(value.allergens) ? value.allergens : [],
    excludedIngredients: Array.isArray(value.excludedIngredients) ? value.excludedIngredients : [],
    candidateCount: value.candidateCount ?? 4,
    excludedRecipes: Array.isArray(value.excludedRecipes) ? value.excludedRecipes : [],
  };
}

function isRecord(value: unknown): value is Record<string, never> {
  return typeof value === 'object' && value !== null;
}

function trimEntries<T>(record: Readonly<Record<string, T>>, limit: number): Record<string, T> {
  const entries = Object.entries(record);
  if (entries.length <= limit) return { ...record };
  return Object.fromEntries(entries.slice(-limit));
}

export type { GenerationRequest };
