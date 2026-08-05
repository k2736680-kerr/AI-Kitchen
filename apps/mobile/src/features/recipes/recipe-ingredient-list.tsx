import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppCard } from '@/components/app-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { RecipeIngredient } from '@ai-kitchen/shared';
import { presentRecipeIngredient, resolveIngredientLocale } from '@/features/ingredients/ingredient-presentation';
import { IngredientThumbnail } from '@/features/ingredients/ingredient-thumbnail';

export function RecipeIngredientList({ title, ingredients }: { readonly title: string; readonly ingredients: readonly RecipeIngredient[] }) {
  const { i18n } = useTranslation(); const locale = resolveIngredientLocale(i18n.language);
  if (ingredients.length === 0) return null;
  return <AppCard>
    <ThemedText type="sectionTitle">{title}</ThemedText>
    <View style={styles.list}>
      {ingredients.map((item) => (
        <View key={`${item.ingredientId}-${item.amount}`} style={styles.row}>
          <View style={styles.thumb}><IngredientThumbnail ingredientId={item.ingredientId} /></View>
          <View style={styles.copy}>
            <ThemedText type="smallBold">{presentRecipeIngredient(item, locale)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{item.amount}</ThemedText>
          </View>
        </View>
      ))}
    </View>
  </AppCard>;
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm, marginTop: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  thumb: { borderRadius: 12, overflow: 'hidden' },
  copy: { flex: 1, gap: 2 },
});
