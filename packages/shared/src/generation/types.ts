import type { SelectedIngredient } from '../ingredients/types';

export const SERVING_OPTIONS = [1, 2, 3, 4, 6, 8, 10, 12] as const;
export const MAX_TIME_OPTIONS = [15, 30, 45, 60] as const;
export const COOKWARE_OPTIONS = [
  'frying-pan',
  'pot',
  'oven',
  'rice-cooker',
] as const;
export const DIETARY_PREFERENCE_OPTIONS = ['vegetarian', 'low-spice', 'easy', 'balanced'] as const;
export const ALLERGEN_OPTIONS = [
  'egg.chicken',
  'wheat.common',
  'milk.cow',
  'nut.peanut',
  'shellfish.shrimp',
] as const;

export type ServingOption = (typeof SERVING_OPTIONS)[number];
export type MaxTimeMinutes = (typeof MAX_TIME_OPTIONS)[number];
export type Cookware = (typeof COOKWARE_OPTIONS)[number];
export type DietaryPreference = (typeof DIETARY_PREFERENCE_OPTIONS)[number];
export type AllergenCode = (typeof ALLERGEN_OPTIONS)[number];
export type GenerationRequestSchemaVersion = 'v1';

export const DIETARY_PREFERENCE_LABELS: Readonly<Record<DietaryPreference, string>> = {
  vegetarian: '素食',
  'low-spice': '清淡少辣',
  easy: '简单易做',
  balanced: '均衡饮食',
};

export const ALLERGEN_LABELS: Readonly<Record<AllergenCode, string>> = {
  'egg.chicken': '鸡蛋',
  'wheat.common': '小麦',
  'milk.cow': '牛奶',
  'nut.peanut': '花生',
  'shellfish.shrimp': '虾蟹贝类',
};

export const COOKWARE_LABELS: Readonly<Record<Cookware, string>> = {
  'frying-pan': '炒锅',
  pot: '汤锅',
  oven: '烤箱',
  'rice-cooker': '电饭锅',
};

export interface GenerationRequest {
  readonly schemaVersion: GenerationRequestSchemaVersion;
  readonly selectedIngredientIds: readonly string[];
  readonly customIngredients: readonly SelectedIngredient[];
  readonly servings: ServingOption;
  readonly maxCookingTimeMinutes: MaxTimeMinutes;
  readonly availableTools: readonly Cookware[];
  readonly dietaryPreferences: readonly DietaryPreference[];
  readonly allergens: readonly AllergenCode[];
  readonly excludedIngredients: readonly string[];
}

export type GenerationDraft = Omit<GenerationRequest, 'schemaVersion'>;
