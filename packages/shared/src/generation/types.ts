import { z } from 'zod';

import { SUPPORTED_LOCALES } from '../ingredients/types';

/** 主要烹饪方式。用于多候选生成时保证一批方案覆盖不同做法。 */
export const COOKING_METHOD_OPTIONS = [
  'stir-fry',
  'stew',
  'steam',
  'soup',
  'cold',
  'roast',
] as const;
export const cookingMethodSchema = z.enum(COOKING_METHOD_OPTIONS);

export const SERVING_OPTIONS = [1, 2, 3, 4, 6, 8, 10, 12] as const;
export const MAX_TIME_OPTIONS = [15, 30, 45, 60] as const;
export const COOKWARE_OPTIONS = ['frying-pan', 'pot', 'oven', 'rice-cooker'] as const;
export const DIETARY_PREFERENCE_OPTIONS = ['vegetarian', 'low-spice', 'easy', 'balanced'] as const;
export const ALLERGEN_OPTIONS = [
  'egg.chicken',
  'wheat.common',
  'milk.cow',
  'nut.peanut',
  'shellfish.shrimp',
] as const;

export const GENERATION_REQUEST_SCHEMA_VERSION = 'v1' as const;

const servingSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4),
  z.literal(6), z.literal(8), z.literal(10), z.literal(12),
]);
const maxTimeSchema = z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]);
const cookwareSchema = z.enum(COOKWARE_OPTIONS);
const dietaryPreferenceSchema = z.enum(DIETARY_PREFERENCE_OPTIONS);
const allergenSchema = z.enum(ALLERGEN_OPTIONS);
const selectedIngredientSchema = z.object({
  id: z.string().trim().min(1).max(80),
  displayName: z.string().trim().min(1).max(30),
  source: z.enum(['catalog', 'custom']),
}).strict();

/** 「再来一批」时传入的已生成菜谱,用于避免与上一批重复。 */
export const excludedRecipeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  cookingMethod: cookingMethodSchema,
}).strict();

const candidateCountSchema = z.union([z.literal(3), z.literal(4), z.literal(5)]);

function uniqueValues<T>(values: readonly T[]): boolean {
  return new Set(values).size === values.length;
}

export const GenerationRequestSchema = z.object({
  schemaVersion: z.literal(GENERATION_REQUEST_SCHEMA_VERSION),
  /** Missing locale from older v1 clients is treated as Simplified Chinese. */
  locale: z.enum(SUPPORTED_LOCALES).default('zh-CN'),
  selectedIngredientIds: z.array(z.string().trim().min(1).max(80)).max(50).refine(uniqueValues, 'values must be unique'),
  customIngredients: z.array(selectedIngredientSchema).max(20),
  servings: servingSchema,
  maxCookingTimeMinutes: maxTimeSchema,
  availableTools: z.array(cookwareSchema).max(COOKWARE_OPTIONS.length).refine(uniqueValues, 'values must be unique'),
  dietaryPreferences: z.array(dietaryPreferenceSchema).max(DIETARY_PREFERENCE_OPTIONS.length).refine(uniqueValues, 'values must be unique'),
  allergens: z.array(allergenSchema).max(ALLERGEN_OPTIONS.length).refine(uniqueValues, 'values must be unique'),
  excludedIngredients: z.array(z.string().trim().min(1).max(80)).max(50).refine(uniqueValues, 'values must be unique'),
  candidateCount: candidateCountSchema.default(4),
  excludedRecipes: z.array(excludedRecipeSchema).max(20).default([]),
}).strict();

export type ServingOption = z.infer<typeof servingSchema>;
export type MaxTimeMinutes = z.infer<typeof maxTimeSchema>;
export type Cookware = z.infer<typeof cookwareSchema>;
export type DietaryPreference = z.infer<typeof dietaryPreferenceSchema>;
export type AllergenCode = z.infer<typeof allergenSchema>;
export type CandidateCount = z.infer<typeof candidateCountSchema>;
export type ExcludedRecipe = z.infer<typeof excludedRecipeSchema>;
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
export type GenerationRequestSchemaVersion = typeof GENERATION_REQUEST_SCHEMA_VERSION;
export type GenerationDraft = Omit<GenerationRequest, 'schemaVersion' | 'locale'>;

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
