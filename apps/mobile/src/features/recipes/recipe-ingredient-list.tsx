import { AppCard } from '@/components/app-card';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import type { RecipeIngredient } from '@ai-kitchen/shared';
import { presentRecipeIngredient, resolveIngredientLocale } from '@/features/ingredients/ingredient-presentation';

export function RecipeIngredientList({ title, ingredients }: { readonly title: string; readonly ingredients: readonly RecipeIngredient[] }) {
  const { i18n } = useTranslation(); const locale = resolveIngredientLocale(i18n.language);
  if (ingredients.length === 0) return null;
  return <AppCard><ThemedText type="sectionTitle">{title}</ThemedText>{ingredients.map((item) => <ThemedText key={`${item.ingredientId}-${item.amount}`}>{presentRecipeIngredient(item, locale)} · {item.amount}</ThemedText>)}</AppCard>;
}
