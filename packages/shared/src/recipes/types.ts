import { z } from 'zod';

import {
  ALLERGEN_OPTIONS,
  COOKWARE_OPTIONS,
  DIETARY_PREFERENCE_OPTIONS,
} from '../generation/types';
import { SUPPORTED_LOCALES } from '../ingredients/types';

export const RECIPE_SCHEMA_VERSION = 'recipe.v1.0.0' as const;

const recipeIngredientSchema = z.object({
  ingredientId: z.string().trim().min(1).max(80),
  displayName: z.string().trim().min(1).max(100),
  amount: z.string().trim().min(1).max(100),
}).strict();

const recipeStepSchema = z.object({
  stepId: z.string().trim().min(1).max(100),
  order: z.number().int().positive(),
  title: z.string().trim().min(1).max(100),
  instruction: z.string().trim().min(1).max(2000),
  durationMinutes: z.number().int().nonnegative().max(240),
  ingredientRefs: z.array(z.string().trim().min(1).max(80)).max(50),
}).strict();

const recipeSafetyNoticeSchema = z.object({
  level: z.enum(['info', 'warning']),
  message: z.string().trim().min(1).max(1000),
  isDemoOnly: z.boolean(),
}).strict();

export const RecipeSchema = z.object({
  recipeId: z.string().trim().min(1).max(120),
  generationMode: z.enum(['fixture', 'provider']),
  /** Content language. Older persisted snapshots default to Simplified Chinese. */
  locale: z.enum(SUPPORTED_LOCALES).default('zh-CN'),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  servings: z.number().int().positive().max(12),
  totalTimeMinutes: z.number().int().positive().max(240),
  difficulty: z.enum(['easy', 'medium']),
  spiceLevel: z.enum(['mild', 'medium']),
  dietaryTags: z.array(z.enum(DIETARY_PREFERENCE_OPTIONS)).max(DIETARY_PREFERENCE_OPTIONS.length),
  allergenCodes: z.array(z.enum(ALLERGEN_OPTIONS)).max(ALLERGEN_OPTIONS.length),
  requiredCookware: z.array(z.enum(COOKWARE_OPTIONS)).max(COOKWARE_OPTIONS.length),
  requiredIngredients: z.array(recipeIngredientSchema).max(50),
  optionalIngredients: z.array(recipeIngredientSchema).max(50),
  missingIngredients: z.array(recipeIngredientSchema).max(50),
  steps: z.array(recipeStepSchema).max(50),
  safetyNotices: z.array(recipeSafetyNoticeSchema).max(50),
  nutritionStatus: z.literal('unavailable'),
}).strict();

export type Recipe = z.infer<typeof RecipeSchema>;
export type RecipeFixture = Recipe;
export type RecipeGenerationMode = Recipe['generationMode'];
export type NutritionStatus = Recipe['nutritionStatus'];
export type RecipeDifficulty = Recipe['difficulty'];
export type RecipeSpiceLevel = Recipe['spiceLevel'];
export type RecipeIngredient = Recipe['requiredIngredients'][number];
export type RecipeStep = Recipe['steps'][number];
export type RecipeSafetyNotice = Recipe['safetyNotices'][number];
