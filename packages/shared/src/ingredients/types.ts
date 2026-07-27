export const INGREDIENT_CATEGORIES = [
  'egg',
  'vegetable',
  'staple',
  'meat',
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export interface IngredientDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly aliases: readonly string[];
  readonly category: IngredientCategory;
}

export interface SelectedIngredient {
  readonly id: string;
  readonly displayName: string;
  readonly source: 'catalog' | 'custom';
}
