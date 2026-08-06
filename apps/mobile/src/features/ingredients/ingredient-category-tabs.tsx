import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { INGREDIENT_CATEGORIES, type IngredientCategory } from '@ai-kitchen/shared';
import { SelectionChip } from '@/components/selection-chip';
import { Spacing } from '@/constants/theme';

const categories: readonly (IngredientCategory | 'all')[] = ['all', ...INGREDIENT_CATEGORIES];

export function IngredientCategoryTabs({ selected, onChange }: { readonly selected: IngredientCategory | 'all'; readonly onChange: (value: IngredientCategory | 'all') => void }) {
  const { t } = useTranslation();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {categories.map((category) => <SelectionChip key={category} label={t(`home.categories.${category}`)} selected={selected === category} role="radio" onPress={() => onChange(category)} />)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  row: { gap: Spacing.xs },
});
