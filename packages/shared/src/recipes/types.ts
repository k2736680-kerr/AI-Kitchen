import type { AllergenCode, Cookware, DietaryPreference } from '../generation/types';

export type RecipeGenerationMode = 'fixture';
export type NutritionStatus = 'unavailable';
export type RecipeDifficulty = 'easy' | 'medium';
export type RecipeSpiceLevel = 'mild' | 'medium';

export interface RecipeIngredient {
  readonly ingredientId: string;
  readonly displayName: string;
  readonly amount: string;
}

export interface RecipeStep {
  readonly stepId: string;
  readonly order: number;
  readonly title: string;
  readonly instruction: string;
  readonly durationMinutes: number;
  readonly ingredientRefs: readonly string[];
}

export interface RecipeSafetyNotice {
  readonly level: 'info' | 'warning';
  readonly message: string;
  readonly isDemoOnly: true;
}

export interface RecipeFixture {
  readonly recipeId: string;
  readonly generationMode: RecipeGenerationMode;
  readonly title: string;
  readonly description: string;
  readonly servings: number;
  readonly totalTimeMinutes: number;
  readonly difficulty: RecipeDifficulty;
  readonly spiceLevel: RecipeSpiceLevel;
  readonly dietaryTags: readonly DietaryPreference[];
  readonly allergenCodes: readonly AllergenCode[];
  readonly requiredCookware: readonly Cookware[];
  readonly requiredIngredients: readonly RecipeIngredient[];
  readonly optionalIngredients: readonly RecipeIngredient[];
  readonly missingIngredients: readonly RecipeIngredient[];
  readonly steps: readonly RecipeStep[];
  readonly safetyNotices: readonly RecipeSafetyNotice[];
  readonly nutritionStatus: NutritionStatus;
}
