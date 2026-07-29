import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { IngredientCategory } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const categories: readonly (IngredientCategory | 'all')[] = ['all', 'egg', 'vegetable', 'staple', 'meat'];

export function IngredientCategoryTabs({ selected, onChange }: { readonly selected: IngredientCategory | 'all'; readonly onChange: (value: IngredientCategory | 'all') => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {categories.map((category) => <Pressable key={category} onPress={() => onChange(category)} style={[styles.tab, { borderColor: theme.border }, selected === category && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
      <ThemedText style={{ color: selected === category ? theme.background : theme.text }}>{t(`home.categories.${category}`)}</ThemedText>
    </Pressable>)}
  </ScrollView>;
}

const styles = StyleSheet.create({ row: { gap: 8 }, tab: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 } });
