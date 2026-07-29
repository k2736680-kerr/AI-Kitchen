export const INGREDIENT_CATEGORIES = [
  'egg',
  'vegetable',
  'staple',
  'meat',
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

/** Locales supported by the versioned generation and presentation contracts. */
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const INGREDIENT_LOCALES = SUPPORTED_LOCALES;
export type IngredientLocale = SupportedLocale;

export interface IngredientLocalization {
  readonly name: string;
  readonly aliases: readonly string[];
}

export interface IngredientDefinition {
  readonly id: string;
  readonly category: IngredientCategory;
  readonly localization: Readonly<Record<IngredientLocale, IngredientLocalization>>;
  /** Compatibility label for non-UI prompt construction. UI must use `localization`. */
  readonly displayName: string;
  readonly allergenCodes?: readonly AllergenCode[];
}

export interface SelectedIngredient {
  readonly id: string;
  readonly displayName: string;
  readonly source: 'catalog' | 'custom';
}
import type { AllergenCode } from '../generation/types';
