import type {
  Cookware,
  IngredientCategory,
  IngredientDefinition,
  MaxTimeMinutes,
  ServingOption,
} from '@ai-kitchen/shared';
import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from 'react';

import { fixtureIngredientRepository } from '../data/fixtures/ingredient-repository';
import { p0Reducer } from './p0-reducer';
import {
  createCustomIngredient,
  createInitialP0State,
  type AddCustomIngredientResult,
  type P0State,
  type RecentRecipeEntry,
} from './p0-state';

interface P0StoreValue {
  readonly state: P0State;
  selectCatalogIngredient(ingredient: IngredientDefinition): void;
  addCustomIngredient(value: string): AddCustomIngredientResult;
  removeIngredient(ingredientId: string): void;
  setServings(servings: ServingOption): void;
  setMaxTime(maxTimeMinutes: MaxTimeMinutes): void;
  toggleCookware(cookware: Cookware): void;
  setSelectedCategory(category: IngredientCategory | 'all'): void;
  setLastRecipe(recipeId: string | null): void;
  addRecentRecipe(entry: RecentRecipeEntry): void;
  initializeCookingSession(recipeId: string, totalSteps: number): void;
  setCookingStep(recipeId: string, stepIndex: number): void;
  completeCookingStep(recipeId: string, stepIndex: number): void;
  resetCookingSession(recipeId: string): void;
  resetGenerationDraft(): void;
}

const P0StoreContext = createContext<P0StoreValue | null>(null);

export function P0StoreProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(
    p0Reducer,
    undefined,
    createInitialP0State,
  );

  const value = useMemo<P0StoreValue>(
    () => ({
      state,
      selectCatalogIngredient: (ingredient) => {
        dispatch({
          type: 'SELECT_CATALOG_INGREDIENT',
          ingredient: {
            id: ingredient.id,
            displayName: ingredient.displayName,
            source: 'catalog',
          },
        });
      },
      addCustomIngredient: (input) => {
        const result = createCustomIngredient(
          input,
          state.selectedIngredients,
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
      setServings: (servings) => {
        dispatch({ type: 'SET_SERVINGS', servings });
      },
      setMaxTime: (maxTimeMinutes) => {
        dispatch({ type: 'SET_MAX_TIME', maxTimeMinutes });
      },
      toggleCookware: (cookware) => {
        dispatch({ type: 'TOGGLE_COOKWARE', cookware });
      },
      setSelectedCategory: (category) => {
        dispatch({ type: 'SET_SELECTED_CATEGORY', category });
      },
      setLastRecipe: (recipeId) => {
        dispatch({ type: 'SET_LAST_RECIPE', recipeId });
      },
      addRecentRecipe: (entry) => {
        dispatch({ type: 'ADD_RECENT_RECIPE', entry });
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
    }),
    [state],
  );

  return <P0StoreContext.Provider value={value}>{children}</P0StoreContext.Provider>;
}

export function useP0Store(): P0StoreValue {
  const context = useContext(P0StoreContext);
  if (!context) {
    throw new Error('useP0Store must be used within a P0StoreProvider.');
  }
  return context;
}
