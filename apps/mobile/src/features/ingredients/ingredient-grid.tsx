import { memo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { IngredientDefinition } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IngredientThumbnail } from './ingredient-thumbnail';
import { presentCatalogIngredient, resolveIngredientLocale } from './ingredient-presentation';

function IngredientGridItemBase({
  ingredient,
  selected,
  onToggle,
}: {
  readonly ingredient: IngredientDefinition;
  readonly selected: boolean;
  readonly onToggle: (ingredient: IngredientDefinition) => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const presentation = presentCatalogIngredient(ingredient, resolveIngredientLocale(i18n.language));

  return <Pressable
    accessibilityRole="checkbox"
    accessibilityState={{ checked: selected }}
    accessibilityHint={selected ? t('home.tapToRemove') : t('home.tapToAdd')}
    onPress={() => onToggle(ingredient)}
    style={({ pressed }) => [
      styles.item,
      { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      selected && styles.selectedBorder,
      pressed && styles.pressed,
    ]}
  >
    {selected ? <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBase} /> : null}
    <View style={styles.imageWrap}>
      <View style={[styles.thumbFrame, { backgroundColor: theme.surfaceTint }]}>
        <IngredientThumbnail ingredientId={ingredient.id} />
      </View>
      {selected ? <View style={styles.checkmark}><ThemedText type="smallBold" style={styles.checkmarkText}>✓</ThemedText></View> : null}
    </View>
    <ThemedText numberOfLines={1} type="smallBold" style={{ color: selected ? theme.onPrimary : theme.text }}>{presentation.name}</ThemedText>
    <ThemedText numberOfLines={1} type="small" style={{ color: selected ? 'rgba(255,255,255,0.85)' : theme.textSecondary }}>
      {selected ? t('home.tapToRemove') : presentation.aliases[0] ? t('home.alias', { value: presentation.aliases[0] }) : t('home.tapToAdd')}
    </ThemedText>
  </Pressable>;
}

export const IngredientGridItem = memo(
  IngredientGridItemBase,
  (previous, next) => previous.ingredient === next.ingredient && previous.selected === next.selected && previous.onToggle === next.onToggle,
);

const styles = StyleSheet.create({
  item: { flex: 1, minHeight: 158, borderWidth: 1, borderRadius: Radius.card, padding: Spacing.sm, gap: 6, overflow: 'hidden', position: 'relative' },
  selectedBorder: { borderColor: 'transparent' },
  gradientBase: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  imageWrap: { alignItems: 'center', position: 'relative', marginTop: 4 },
  thumbFrame: { width: 92, height: 92, borderRadius: Radius.button, overflow: 'hidden' },
  checkmark: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 13, height: 26, justifyContent: 'center', position: 'absolute', right: 8, top: 2, width: 26 },
  checkmarkText: { color: '#4F8062', lineHeight: 18, fontSize: 13 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
});
