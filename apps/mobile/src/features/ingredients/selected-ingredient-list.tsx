import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { SelectedIngredient } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function SelectedIngredientList({ ingredients, onRemove }: { readonly ingredients: readonly SelectedIngredient[]; readonly onRemove: (id: string) => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (ingredients.length === 0) return <ThemedText themeColor="textSecondary">{t('home.noSelection')}</ThemedText>;
  return <View style={styles.list}>{ingredients.map((ingredient) => <View key={ingredient.id} style={styles.row}><ThemedText>{ingredient.displayName}</ThemedText><Pressable accessibilityRole="button" accessibilityLabel={`${t('common.remove')} ${ingredient.displayName}`} onPress={() => onRemove(ingredient.id)}><ThemedText type="small" style={{ color: theme.primary }}>{t('common.remove')}</ThemedText></Pressable></View>)}</View>;
}

const styles = StyleSheet.create({ list: { gap: 8 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } });
