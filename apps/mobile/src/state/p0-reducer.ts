import type {
  ApiError,
  AllergenCode,
  Cookware,
  DietaryPreference,
  GenerationRequest,
  Recipe,
  IngredientCategory,
  MaxTimeMinutes,
  SelectedIngredient,
  ServingOption,
} from '@ai-kitchen/shared';

import {
  createInitialP0State,
  type RecentRecipeEntry,
  type P0State,
} from './p0-state';

export type P0Action =
  | { readonly type: 'SELECT_CATALOG_INGREDIENT'; readonly ingredient: SelectedIngredient }
  | { readonly type: 'ADD_CUSTOM_INGREDIENT'; readonly ingredient: SelectedIngredient }
  | { readonly type: 'REMOVE_INGREDIENT'; readonly ingredientId: string }
  | { readonly type: 'CLEAR_SELECTED_INGREDIENTS' }
  | { readonly type: 'SET_SERVINGS'; readonly servings: ServingOption }
  | { readonly type: 'SET_MAX_TIME'; readonly maxTimeMinutes: MaxTimeMinutes }
  | { readonly type: 'TOGGLE_COOKWARE'; readonly cookware: Cookware }
  | { readonly type: 'TOGGLE_DIETARY_PREFERENCE'; readonly preference: DietaryPreference }
  | { readonly type: 'TOGGLE_ALLERGEN'; readonly allergen: AllergenCode }
  | { readonly type: 'TOGGLE_EXCLUDED_INGREDIENT'; readonly ingredientId: string }
  | { readonly type: 'CLEAR_DIETARY_PREFERENCES' }
  | { readonly type: 'CLEAR_ALLERGENS' }
  | { readonly type: 'CLEAR_EXCLUDED_INGREDIENTS' }
  | {
      readonly type: 'SET_SELECTED_CATEGORY';
      readonly category: IngredientCategory | 'all';
    }
  | { readonly type: 'SET_LAST_RECIPE'; readonly recipeId: string | null }
  | { readonly type: 'START_GENERATION'; readonly requestId: string; readonly idempotencyKey: string; readonly request: GenerationRequest }
  | { readonly type: 'SET_GENERATION_SUCCEEDED'; readonly recipe: Recipe; readonly source: 'local' | 'deterministic' | 'provider' }
  | { readonly type: 'SET_GENERATION_NO_MATCH'; readonly message: string }
  | { readonly type: 'SET_GENERATION_FAILED'; readonly error: ApiError }
  | { readonly type: 'CANCEL_GENERATION' }
  | { readonly type: 'CACHE_RECIPE'; readonly recipe: Recipe }
  | { readonly type: 'ADD_RECENT_RECIPE'; readonly entry: RecentRecipeEntry }
  | { readonly type: 'INITIALIZE_COOKING_SESSION'; readonly recipeId: string; readonly totalSteps: number }
  | { readonly type: 'SET_COOKING_STEP'; readonly recipeId: string; readonly stepIndex: number }
  | { readonly type: 'COMPLETE_COOKING_STEP'; readonly recipeId: string; readonly stepIndex: number }
  | { readonly type: 'RESET_COOKING_SESSION'; readonly recipeId: string }
  | { readonly type: 'RESET_GENERATION_DRAFT' }
  | { readonly type: 'RESET_SESSION'; readonly state: P0State };

function toGenerationDraft(
  selectedIngredients: readonly SelectedIngredient[],
  state: P0State,
): P0State['generationDraft'] {
  return {
    ...state.generationDraft,
    selectedIngredientIds: selectedIngredients
      .filter((ingredient) => ingredient.source === 'catalog')
      .map((ingredient) => ingredient.id),
    customIngredients: selectedIngredients.filter(
      (ingredient) => ingredient.source === 'custom',
    ),
  };
}

function addIngredient(
  state: P0State,
  ingredient: SelectedIngredient,
): P0State {
  if (state.selectedIngredients.some((item) => item.id === ingredient.id)) {
    return state;
  }

  const selectedIngredients = [...state.selectedIngredients, ingredient];
  return {
    ...state,
    selectedIngredients,
    generationDraft: toGenerationDraft(selectedIngredients, state),
  };
}

function validStepIndex(session: P0State['cookingSessions'][string], stepIndex: number): boolean {
  return Number.isInteger(stepIndex) && stepIndex >= 0 && stepIndex < session.totalSteps;
}

function nextIncompleteStep(session: P0State['cookingSessions'][string], fromIndex: number): number {
  const completed = new Set(session.completedStepIndexes);
  for (let index = fromIndex + 1; index < session.totalSteps; index += 1) {
    if (!completed.has(index)) return index;
  }
  for (let index = 0; index < fromIndex; index += 1) {
    if (!completed.has(index)) return index;
  }
  return session.currentStepIndex;
}

export function p0Reducer(state: P0State, action: P0Action): P0State {
  switch (action.type) {
    case 'SELECT_CATALOG_INGREDIENT':
    case 'ADD_CUSTOM_INGREDIENT':
      return addIngredient(state, action.ingredient);

    case 'REMOVE_INGREDIENT': {
      const selectedIngredients = state.selectedIngredients.filter(
        (ingredient) => ingredient.id !== action.ingredientId,
      );
      if (selectedIngredients.length === state.selectedIngredients.length) {
        return state;
      }
      return {
        ...state,
        selectedIngredients,
        generationDraft: toGenerationDraft(selectedIngredients, state),
      };
    }

    case 'CLEAR_SELECTED_INGREDIENTS':
      return {
        ...state,
        selectedIngredients: [],
        generationDraft: toGenerationDraft([], state),
      };

    case 'SET_SERVINGS':
      return {
        ...state,
        generationDraft: { ...state.generationDraft, servings: action.servings },
      };

    case 'SET_MAX_TIME':
      return {
        ...state,
        generationDraft: {
          ...state.generationDraft,
          maxCookingTimeMinutes: action.maxTimeMinutes,
        },
      };

    case 'TOGGLE_COOKWARE': {
      const availableTools = state.generationDraft.availableTools.includes(action.cookware)
        ? state.generationDraft.availableTools.filter((item) => item !== action.cookware)
        : [...state.generationDraft.availableTools, action.cookware];
      return {
        ...state,
        generationDraft: { ...state.generationDraft, availableTools },
      };
    }

    case 'TOGGLE_DIETARY_PREFERENCE': {
      const dietaryPreferences = state.generationDraft.dietaryPreferences.includes(action.preference)
        ? state.generationDraft.dietaryPreferences.filter((item) => item !== action.preference)
        : [...state.generationDraft.dietaryPreferences, action.preference];
      return { ...state, generationDraft: { ...state.generationDraft, dietaryPreferences } };
    }

    case 'TOGGLE_ALLERGEN': {
      const allergens = state.generationDraft.allergens.includes(action.allergen)
        ? state.generationDraft.allergens.filter((item) => item !== action.allergen)
        : [...state.generationDraft.allergens, action.allergen];
      return { ...state, generationDraft: { ...state.generationDraft, allergens } };
    }

    case 'TOGGLE_EXCLUDED_INGREDIENT': {
      const excludedIngredients = state.generationDraft.excludedIngredients.includes(action.ingredientId)
        ? state.generationDraft.excludedIngredients.filter((item) => item !== action.ingredientId)
        : [...state.generationDraft.excludedIngredients, action.ingredientId];
      return { ...state, generationDraft: { ...state.generationDraft, excludedIngredients } };
    }

    case 'CLEAR_DIETARY_PREFERENCES':
      return { ...state, generationDraft: { ...state.generationDraft, dietaryPreferences: [] } };

    case 'CLEAR_ALLERGENS':
      return { ...state, generationDraft: { ...state.generationDraft, allergens: [] } };

    case 'CLEAR_EXCLUDED_INGREDIENTS':
      return { ...state, generationDraft: { ...state.generationDraft, excludedIngredients: [] } };

    case 'SET_SELECTED_CATEGORY':
      return {
        ...state,
        uiPreferences: { ...state.uiPreferences, selectedCategory: action.category },
      };

    case 'SET_LAST_RECIPE':
      return { ...state, lastRecipeId: action.recipeId };

    case 'START_GENERATION':
      if (state.generation.status === 'generating') return state;
      return {
        ...state,
        generation: {
          status: 'generating',
          requestId: action.requestId,
          idempotencyKey: action.idempotencyKey,
          recipeId: null,
          error: null,
          message: null,
          requestSnapshot: action.request,
          source: null,
        },
      };

    case 'SET_GENERATION_SUCCEEDED':
      return {
        ...state,
        recipeCache: { ...state.recipeCache, [action.recipe.recipeId]: action.recipe },
        generation: {
          ...state.generation,
          status: 'succeeded',
          recipeId: action.recipe.recipeId,
          error: null,
          message: null,
          source: action.source,
        },
      };

    case 'SET_GENERATION_NO_MATCH':
      return {
        ...state,
        generation: {
          ...state.generation,
          status: 'no-match',
          recipeId: null,
          error: null,
          message: action.message,
        },
      };

    case 'SET_GENERATION_FAILED':
      return {
        ...state,
        generation: {
          ...state.generation,
          status: 'failed',
          recipeId: null,
          error: action.error,
        },
      };

    case 'CANCEL_GENERATION':
      return {
        ...state,
        generation: { ...state.generation, status: 'cancelled' },
      };

    case 'ADD_RECENT_RECIPE': {
      const recentRecipes = [
        action.entry,
        ...state.recentRecipes.filter(
          (entry) => entry.recipeId !== action.entry.recipeId,
        ),
      ].slice(0, 10);
      return { ...state, recentRecipes };
    }

    case 'CACHE_RECIPE':
      return { ...state, recipeCache: { ...state.recipeCache, [action.recipe.recipeId]: action.recipe } };

    case 'INITIALIZE_COOKING_SESSION': {
      if (!action.recipeId || action.totalSteps <= 0 || !Number.isInteger(action.totalSteps)) return state;
      const existing = state.cookingSessions[action.recipeId];
      return {
        ...state,
        activeCookingRecipeId: action.recipeId,
        cookingSessions: existing
          ? state.cookingSessions
          : {
              ...state.cookingSessions,
              [action.recipeId]: {
                recipeId: action.recipeId,
                totalSteps: action.totalSteps,
                currentStepIndex: 0,
                completedStepIndexes: [],
                status: 'in-progress',
              },
            },
      };
    }

    case 'SET_COOKING_STEP': {
      const session = state.cookingSessions[action.recipeId];
      if (!session || !validStepIndex(session, action.stepIndex)) return state;
      return {
        ...state,
        activeCookingRecipeId: action.recipeId,
        cookingSessions: {
          ...state.cookingSessions,
          [action.recipeId]: { ...session, currentStepIndex: action.stepIndex },
        },
      };
    }

    case 'COMPLETE_COOKING_STEP': {
      const session = state.cookingSessions[action.recipeId];
      if (!session || !validStepIndex(session, action.stepIndex)) return state;
      const completed = session.completedStepIndexes.includes(action.stepIndex)
        ? session.completedStepIndexes
        : [...session.completedStepIndexes, action.stepIndex].sort((a, b) => a - b);
      const isComplete = completed.length === session.totalSteps;
      return {
        ...state,
        activeCookingRecipeId: action.recipeId,
        cookingSessions: {
          ...state.cookingSessions,
          [action.recipeId]: {
            ...session,
            currentStepIndex: isComplete
              ? session.currentStepIndex
              : nextIncompleteStep({ ...session, completedStepIndexes: completed }, action.stepIndex),
            completedStepIndexes: completed,
            status: isComplete ? 'completed' : 'in-progress',
          },
        },
      };
    }

    case 'RESET_COOKING_SESSION': {
      const session = state.cookingSessions[action.recipeId];
      if (!session) return state;
      return {
        ...state,
        activeCookingRecipeId: action.recipeId,
        cookingSessions: {
          ...state.cookingSessions,
          [action.recipeId]: { ...session, currentStepIndex: 0, completedStepIndexes: [], status: 'in-progress' },
        },
      };
    }

    case 'RESET_GENERATION_DRAFT': {
      const resetState = createInitialP0State(state.guestId);
      return {
        ...state,
        selectedIngredients: resetState.selectedIngredients,
        generationDraft: resetState.generationDraft,
      };
    }

    case 'RESET_SESSION':
      return action.state;
  }
}
