import { memo, type ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import type { IngredientDefinition } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ThemeColors } from '@/constants/theme';
import { resolveIngredientLocale, presentCatalogIngredient } from './ingredient-presentation';
import { IngredientThumbnail } from './ingredient-thumbnail';

type GridItemProps = {
  readonly ingredient: IngredientDefinition;
  readonly selected: boolean;
  readonly onToggle: (ingredient: IngredientDefinition) => void;
  readonly theme: ThemeColors;
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
  readonly locale: 'zh-CN' | 'en-US';
};

function GridItemBase({ ingredient, selected, onToggle, theme, t, locale }: GridItemProps) {
  const presentation = presentCatalogIngredient(ingredient, locale);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityHint={selected ? t('home.tapToRemove') : t('home.tapToAdd')}
      onPress={() => onToggle(ingredient)}
      style={[styles.item, { borderColor: theme.border }, selected && styles.selectedBorder]}
    >
      {selected && <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientBase]} />}
      <View style={styles.imageWrap}>
        <View style={[styles.thumbFrame, { backgroundColor: theme.surfaceTint }, selected && styles.thumbFrameSelected]}>
          <IngredientThumbnail ingredientId={ingredient.id} />
        </View>
        {selected && <View style={styles.checkmark}><ThemedText type="smallBold" style={styles.checkmarkText}>✓</ThemedText></View>}
      </View>
      <ThemedText numberOfLines={1} type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.text }}>{presentation.name}</ThemedText>
      <ThemedText numberOfLines={1} type="small" style={{ color: selected ? 'rgba(255,255,255,0.85)' : theme.textSecondary }}>{selected ? t('home.tapToRemove') : presentation.aliases[0] ? t('home.alias', { value: presentation.aliases[0] }) : t('home.tapToAdd')}</ThemedText>
    </Pressable>
  );
}

const IngredientGridItem = memo(
  GridItemBase,
  (prev, next) => prev.ingredient === next.ingredient && prev.selected === next.selected && prev.onToggle === next.onToggle && prev.theme === next.theme && prev.locale === next.locale,
);

export function IngredientGrid({ ingredients, selectedIds, onToggle }: { readonly ingredients: readonly IngredientDefinition[]; readonly selectedIds: readonly string[]; readonly onToggle: (ingredient: IngredientDefinition) => void }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const locale = resolveIngredientLocale(i18n.language);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const items: ReactNode[] = ingredients.map((ingredient) => (
    <IngredientGridItem
      key={ingredient.id}
      ingredient={ingredient}
      selected={selectedSet.has(ingredient.id)}
      onToggle={onToggle}
      theme={theme}
      t={t}
      locale={locale}
    />
  ));
  return <View style={styles.grid}>{items}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  item: { width: '48%', minHeight: 158, borderWidth: 1, borderRadius: Radius.card, padding: Spacing.sm, gap: 6, overflow: 'hidden', position: 'relative' },
  selectedBorder: { borderColor: 'transparent' },
  gradientBase: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  imageWrap: { alignItems: 'center', position: 'relative', marginTop: 4 },
  thumbFrame: { borderRadius: Radius.button, overflow: 'hidden' },
  thumbFrameSelected: { borderRadius: Radius.button },
  checkmark: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 13, height: 26, justifyContent: 'center', position: 'absolute', right: 8, top: 2, width: 26 },
  checkmarkText: { color: '#4F8062', lineHeight: 18, fontSize: 13 },
});
