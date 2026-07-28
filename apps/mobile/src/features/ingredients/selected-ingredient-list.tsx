import { Pressable, StyleSheet, View } from 'react-native';

import type { SelectedIngredient } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function SelectedIngredientList({ ingredients, onRemove }: { readonly ingredients: readonly SelectedIngredient[]; readonly onRemove: (id: string) => void }) {
  const theme = useTheme();
  if (ingredients.length === 0) return <ThemedText themeColor="textSecondary">至少选择一种食材后才能继续</ThemedText>;
  return <View style={styles.list}>{ingredients.map((ingredient) => <View key={ingredient.id} style={styles.row}><ThemedText>{ingredient.displayName}{ingredient.source === 'custom' ? ' · 自定义' : ''}</ThemedText><Pressable onPress={() => onRemove(ingredient.id)}><ThemedText style={{ color: theme.textSecondary }}>移除</ThemedText></Pressable></View>)}</View>;
}

const styles = StyleSheet.create({ list: { gap: 8 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } });
