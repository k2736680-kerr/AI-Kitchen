import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RecipeFixture } from '@ai-kitchen/shared';
import { RecipeSourceBadge } from './recipe-source-badge';

export function RecipeHeader({ recipe, selectedServings, source }: { readonly recipe: RecipeFixture; readonly selectedServings: number; readonly source?: 'local' | 'remote' | 'fixture' }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const difficulty = t(recipe.difficulty === 'easy' ? 'recipe.easy' : recipe.difficulty === 'hard' ? 'recipe.hard' : 'recipe.medium');
  const spice = recipe.spiceLevel === 'hot' ? '🌶️' : recipe.spiceLevel === 'medium' ? '🌶️' : '';
  return <>
    <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
      <ThemedText style={styles.title}>{recipe.title}</ThemedText>
      <ThemedText style={styles.desc}>{recipe.description}</ThemedText>
      <View style={styles.metaRow}>
        <ThemedText style={styles.metaText}>{t('recipe.timeServings', { time: t('common.minutes', { count: recipe.totalTimeMinutes }), servings: recipe.servings, difficulty })}</ThemedText>
        {spice ? <ThemedText style={styles.metaText}>{spice}</ThemedText> : null}
      </View>
      <View style={styles.badgeRow}><RecipeSourceBadge source={source} inverse /></View>
    </LinearGradient>
    {selectedServings !== recipe.servings && <ThemedText type="small" themeColor="textSecondary" style={styles.notice}>{t('recipe.servingsNotice', { count: selectedServings })}</ThemedText>}
  </>;
}

const styles = StyleSheet.create({
  banner: { borderRadius: 20, padding: Spacing.lg, gap: Spacing.xs, marginBottom: Spacing.sm },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  desc: { fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.92)' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  metaText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  badgeRow: { marginTop: Spacing.xs },
  notice: { marginBottom: Spacing.sm },
});
