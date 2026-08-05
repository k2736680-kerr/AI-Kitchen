export const INGREDIENT_CATEGORIES = [
  'egg',
  'vegetable',
  'staple',
  'meat',
  'seafood',
  'soy',
  'dairy',
  'fruit',
  'condiment',
  'spice',
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
  /**
   * 调料/香料类食材(盐、糖、生抽、葱姜蒜等)。
   * 此类食材允许出现在菜谱 requiredIngredients 中而不要求用户显式选择,
   * 视为厨房常备。主食材仍必须来自用户已选。
   */
  readonly isCondiment?: boolean;
}

export interface SelectedIngredient {
  readonly id: string;
  readonly displayName: string;
  readonly source: 'catalog' | 'custom';
}
import type { AllergenCode } from '../generation/types';
