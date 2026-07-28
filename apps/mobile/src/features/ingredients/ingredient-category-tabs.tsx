import { Pressable, ScrollView, StyleSheet } from 'react-native';

import type { IngredientCategory } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const categories: readonly { value: IngredientCategory | 'all'; label: string }[] = [
  { value: 'all', label: '全部' }, { value: 'egg', label: '蛋类' },
  { value: 'vegetable', label: '蔬菜' }, { value: 'staple', label: '主食' }, { value: 'meat', label: '肉类' },
];

export function IngredientCategoryTabs({ selected, onChange }: { readonly selected: IngredientCategory | 'all'; readonly onChange: (value: IngredientCategory | 'all') => void }) {
  const theme = useTheme();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {categories.map((category) => <Pressable key={category.value} onPress={() => onChange(category.value)} style={[styles.tab, { borderColor: theme.text }, selected === category.value && { backgroundColor: theme.text }]}>
      <ThemedText style={{ color: selected === category.value ? theme.background : theme.text }}>{category.label}</ThemedText>
    </Pressable>)}
  </ScrollView>;
}

const styles = StyleSheet.create({ row: { gap: 8 }, tab: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 } });
