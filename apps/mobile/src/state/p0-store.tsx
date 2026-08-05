import type {
  ApiError,
  AllergenCode,
  Cookware,
  DietaryPreference,
  GenerationRequest,
  IngredientCategory,
  IngredientDefinition,
  MaxTimeMinutes,
  Recipe,
  ServingOption,
  SupportedLocale,
} from '@ai-kitchen/shared';
import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useReducer,
  useState,
  type PropsWithChildren,
} from 'react';

import { createIdempotencyKey, createRequestId } from '../data/api/request-ids';
import { guestSessionService } from '../auth/guest-session';
import { environmentConfig } from '../config/environment';
import { fixtureIngredientRepository } from '../data/fixtures/ingredient-repository';
import { p0Reducer } from './p0-reducer';
import {
  clearPersistedP0State,
  deserializeP0State,
  loadPersistedP0State,
  savePersistedP0State,
  serializeP0State,
} from './p0-persist';
import {
  createCustomIngredient,
  createGenerationRequest,
  createInitialP0State,
  type AddCustomIngredientResult,
  type P0State,
  type RecentRecipeEntry,
} from './p0-state';

interface P0StoreValue {
  readonly state: P0State;
  toggleCatalogIngredient(ingredient: IngredientDefinition): void;
  addCustomIngredient(value: string): AddCustomIngredientResult;
  removeIngredient(ingredientId: string): void;
  clearSelectedIngredients(): void;
  setServings(servings: ServingOption): void;
  setMaxTime(maxTimeMinutes: MaxTimeMinutes): void;
  toggleCookware(cookware: Cookware): void;
  toggleDietaryPreference(preference: DietaryPreference): void;
  toggleAllergen(allergen: AllergenCode): void;
  toggleExcludedIngredient(ingredientId: string): void;
  clearDietaryPreferences(): void;
  clearAllergens(): void;
  clearExcludedIngredients(): void;
  setSelectedCategory(category: IngredientCategory | 'all'): void;
  setLastRecipe(recipeId: string | null): void;
  startGeneration(locale: SupportedLocale, excludedRecipes?: GenerationRequest['excludedRecipes']): void;
  setGenerationSucceeded(recipes: readonly Recipe[], source: 'local' | 'deterministic' | 'provider'): void;
  setGenerationNoMatch(message: string): void;
  setGenerationFailed(error: ApiError): void;
  cancelGeneration(): void;
  cacheRecipe(recipe: Recipe): void;
  addRecentRecipe(entry: RecentRecipeEntry): void;
  toggleFavoriteRecipe(recipeId: string): void;
  isFavoriteRecipe(recipeId: string): boolean;
  clearLocalData(): Promise<void>;
  initializeCookingSession(recipeId: string, totalSteps: number): void;
  setCookingStep(recipeId: string, stepIndex: number): void;
  completeCookingStep(recipeId: string, stepIndex: number): void;
  resetCookingSession(recipeId: string): void;
  resetGenerationDraft(): void;
  retryGuestSession(): void;
}

const P0StoreContext = createContext<P0StoreValue | null>(null);

export function P0StoreProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(
    p0Reducer,
    undefined,
    createInitialP0State,
  );

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let active = true;
    void loadPersistedP0State().then((raw) => {
      if (!active) return;
      if (raw) {
        const patch = deserializeP0State(raw, stateRef.current.guestId);
        dispatch({ type: 'RESET_SESSION', state: { ...stateRef.current, ...patch, generation: stateRef.current.generation, identityStatus: stateRef.current.identityStatus } });
      }
    }).finally(() => {
      if (active) setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  // 防抖持久化:state 稳定 300ms 后写回 AsyncStorage。
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void savePersistedP0State(serializeP0State(stateRef.current)).catch(() => undefined);
    }, 300);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [state, hydrated]);

  useEffect(() => {
    if (environmentConfig.generationMode === 'local') {
      dispatch({ type: 'SET_GUEST_IDENTITY_READY' });
      return;
    }
    let active = true;
    void guestSessionService.bootstrapGuestSession().then((session) => {
      if (active) dispatch({ type: 'SET_GUEST_IDENTITY', guestId: session.subject.id });
    }).catch((error: unknown) => {
      if (!active) return;
      dispatch({ type: 'SET_GUEST_IDENTITY_ERROR', message: error instanceof Error ? error.message : '游客会话初始化失败，请重试。' });
    });
    return () => { active = false; };
  }, []);

  const actions = useMemo<Omit<P0StoreValue, 'state'>>(
    () => ({
      toggleCatalogIngredient: (ingredient) => {
        dispatch({
          type: 'TOGGLE_CATALOG_INGREDIENT',
          ingredient: {
            id: ingredient.id,
            displayName: ingredient.localization['zh-CN'].name,
            source: 'catalog',
          },
        });
      },
      addCustomIngredient: (input) => {
        const result = createCustomIngredient(
          input,
          stateRef.current.selectedIngredients,
          fixtureIngredientRepository.listAll(),
        );
        if (result.ok) {
          dispatch({ type: 'ADD_CUSTOM_INGREDIENT', ingredient: result.ingredient });
        }
        return result;
      },
      removeIngredient: (ingredientId) => {
        dispatch({ type: 'REMOVE_INGREDIENT', ingredientId });
      },
      clearSelectedIngredients: () => {
        dispatch({ type: 'CLEAR_SELECTED_INGREDIENTS' });
      },
      setServings: (servings) => {
        dispatch({ type: 'SET_SERVINGS', servings });
      },
      setMaxTime: (maxTimeMinutes) => {
        dispatch({ type: 'SET_MAX_TIME', maxTimeMinutes });
      },
      toggleCookware: (cookware) => {
        dispatch({ type: 'TOGGLE_COOKWARE', cookware });
      },
      toggleDietaryPreference: (preference) => {
        dispatch({ type: 'TOGGLE_DIETARY_PREFERENCE', preference });
      },
      toggleAllergen: (allergen) => {
        dispatch({ type: 'TOGGLE_ALLERGEN', allergen });
      },
      toggleExcludedIngredient: (ingredientId) => {
        dispatch({ type: 'TOGGLE_EXCLUDED_INGREDIENT', ingredientId });
      },
      clearDietaryPreferences: () => {
        dispatch({ type: 'CLEAR_DIETARY_PREFERENCES' });
      },
      clearAllergens: () => {
        dispatch({ type: 'CLEAR_ALLERGENS' });
      },
      clearExcludedIngredients: () => {
        dispatch({ type: 'CLEAR_EXCLUDED_INGREDIENTS' });
      },
      setSelectedCategory: (category) => {
        dispatch({ type: 'SET_SELECTED_CATEGORY', category });
      },
      setLastRecipe: (recipeId) => {
        dispatch({ type: 'SET_LAST_RECIPE', recipeId });
      },
      startGeneration: (locale, excludedRecipes = []) => {
        dispatch({ type: 'START_GENERATION', requestId: createRequestId(), idempotencyKey: createIdempotencyKey(), request: createGenerationRequest(stateRef.current, locale, excludedRecipes) });
      },
      setGenerationSucceeded: (recipes, source) => {
        dispatch({ type: 'SET_GENERATION_SUCCEEDED', recipes, source });
      },
      setGenerationNoMatch: (message) => {
        dispatch({ type: 'SET_GENERATION_NO_MATCH', message });
      },
      setGenerationFailed: (error) => {
        dispatch({ type: 'SET_GENERATION_FAILED', error });
      },
      cancelGeneration: () => {
        dispatch({ type: 'CANCEL_GENERATION' });
      },
      cacheRecipe: (recipe) => {
        dispatch({ type: 'CACHE_RECIPE', recipe });
      },
      addRecentRecipe: (entry) => {
        dispatch({ type: 'ADD_RECENT_RECIPE', entry });
      },
      toggleFavoriteRecipe: (recipeId) => {
        dispatch({ type: 'TOGGLE_FAVORITE_RECIPE', recipeId });
      },
      isFavoriteRecipe: (recipeId) => stateRef.current.favoriteRecipeIds.includes(recipeId),
      clearLocalData: async () => {
        await clearPersistedP0State();
        dispatch({ type: 'RESET_SESSION', state: createInitialP0State(stateRef.current.guestId) });
      },
      initializeCookingSession: (recipeId, totalSteps) => {
        dispatch({ type: 'INITIALIZE_COOKING_SESSION', recipeId, totalSteps });
      },
      setCookingStep: (recipeId, stepIndex) => {
        dispatch({ type: 'SET_COOKING_STEP', recipeId, stepIndex });
      },
      completeCookingStep: (recipeId, stepIndex) => {
        dispatch({ type: 'COMPLETE_COOKING_STEP', recipeId, stepIndex });
      },
      resetCookingSession: (recipeId) => {
        dispatch({ type: 'RESET_COOKING_SESSION', recipeId });
      },
      resetGenerationDraft: () => {
        dispatch({ type: 'RESET_GENERATION_DRAFT' });
      },
      retryGuestSession: () => {
        dispatch({ type: 'SET_GUEST_IDENTITY_ERROR', message: '正在初始化游客会话。' });
        void guestSessionService.bootstrapGuestSession().then((session) => {
          dispatch({ type: 'SET_GUEST_IDENTITY', guestId: session.subject.id });
        }).catch((error: unknown) => {
          dispatch({ type: 'SET_GUEST_IDENTITY_ERROR', message: error instanceof Error ? error.message : '游客会话初始化失败，请重试。' });
        });
      },
    }),
    [],
  );

  const value = useMemo<P0StoreValue>(() => ({ state, ...actions }), [actions, state]);

  return <P0StoreContext.Provider value={value}>{children}</P0StoreContext.Provider>;
}

export function useP0Store(): P0StoreValue {
  const context = useContext(P0StoreContext);
  if (!context) {
    throw new Error('useP0Store must be used within a P0StoreProvider.');
  }
  return context;
}
