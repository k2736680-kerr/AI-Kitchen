import { AppCard } from '@/components/app-card';
import { ThemedText } from '@/components/themed-text';
import type { RecipeIngredient } from '@ai-kitchen/shared';

export function RecipeIngredientList({ title, ingredients }: { readonly title: string; readonly ingredients: readonly RecipeIngredient[] }) {
  if (ingredients.length === 0) return null;
  return <AppCard><ThemedText type="sectionTitle">{title}</ThemedText>{ingredients.map((item) => <ThemedText key={`${item.ingredientId}-${item.amount}`}>{item.displayName} · {item.amount}</ThemedText>)}</AppCard>;
}
