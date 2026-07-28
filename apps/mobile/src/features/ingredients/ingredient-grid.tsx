import { Pressable, StyleSheet, View } from 'react-native';

import type { IngredientDefinition } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function IngredientGrid({ ingredients, selectedIds, onToggle }: { readonly ingredients: readonly IngredientDefinition[]; readonly selectedIds: readonly string[]; readonly onToggle: (ingredient: IngredientDefinition) => void }) {
  const theme = useTheme();
  return <View style={styles.grid}>{ingredients.map((ingredient) => { const selected = selectedIds.includes(ingredient.id); return <Pressable key={ingredient.id} onPress={() => onToggle(ingredient)} style={[styles.item, { borderColor: theme.textSecondary }, selected && { backgroundColor: theme.text, borderColor: theme.text }]}>
    <ThemedText style={{ color: selected ? theme.background : theme.text }}>{ingredient.displayName}</ThemedText>
    <ThemedText type="small" style={{ color: selected ? theme.background : theme.textSecondary }}>{selected ? '已选' : ingredient.aliases[0] ? `别名：${ingredient.aliases[0]}` : '选择'}</ThemedText>
  </Pressable>; })}</View>;
}

const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, item: { width: '48%', minHeight: 68, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 } });
