import type { SelectedIngredient } from '../ingredients/types';

export const SERVING_OPTIONS = [1, 2, 3, 4, 6, 8, 10, 12] as const;
export const MAX_TIME_OPTIONS = [15, 30, 45, 60] as const;
export const COOKWARE_OPTIONS = [
  'frying-pan',
  'pot',
  'oven',
  'rice-cooker',
] as const;

export type ServingOption = (typeof SERVING_OPTIONS)[number];
export type MaxTimeMinutes = (typeof MAX_TIME_OPTIONS)[number];
export type Cookware = (typeof COOKWARE_OPTIONS)[number];

export interface GenerationDraft {
  readonly ingredientIds: readonly string[];
  readonly customIngredients: readonly SelectedIngredient[];
  readonly servings: ServingOption;
  readonly maxTimeMinutes: MaxTimeMinutes;
  readonly cookware: readonly Cookware[];
}
