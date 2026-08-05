import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { INGREDIENT_CATEGORIES, type IngredientCategory } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const categories: readonly (IngredientCategory | 'all')[] = ['all', ...INGREDIENT_CATEGORIES];

export function IngredientCategoryTabs({ selected, onChange }: { readonly selected: IngredientCategory | 'all'; readonly onChange: (value: IngredientCategory | 'all') => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {categories.map((category) => { const active = selected === category; return (
      <Pressable key={category} onPress={() => onChange(category)} style={[styles.tab, { borderColor: theme.border, backgroundColor: theme.surfaceTint }, active && { borderColor: 'transparent' }]}>
        {active && <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient} />}
        <ThemedText type="smallBold" style={{ color: active ? '#FFFFFF' : theme.text }}>{t(`home.categories.${category}`)}</ThemedText>
      </Pressable>
    ); })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  row: { gap: Spacing.xs },
  tab: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, overflow: 'hidden', position: 'relative' },
  gradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
});
