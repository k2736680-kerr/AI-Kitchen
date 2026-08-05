import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Recipe, SupportedLocale } from '@ai-kitchen/shared';
import { fixtureRecipeRepository } from '@/data/fixtures/recipe-repository';
import type { RecentRecipeEntry } from '@/state/p0-state';

export function RecentRecipeList({ entries, recipeCache, locale }: { readonly entries: readonly RecentRecipeEntry[]; readonly recipeCache: Readonly<Record<string, Recipe>>; readonly locale: SupportedLocale }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const localizedEntries = entries.filter((entry) => entry.locale === locale);
  if (localizedEntries.length === 0) return <StatusMessage message={t('history.empty')} />;
  return <>{localizedEntries.map((entry) => { const recipe = recipeCache[entry.recipeId] ?? fixtureRecipeRepository.getById(entry.recipeId); if (!recipe) return <StatusMessage key={entry.recipeId} message={t('history.unavailable')} tone="warning" />; return (
    <AppCard key={entry.recipeId}>
      <View style={styles.headRow}>
        <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}><ThemedText style={{ fontSize: 18 }}>🍲</ThemedText></LinearGradient>
        <View style={styles.copy}>
          <ThemedText type="subtitle">{recipe.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{t('common.minutes', { count: recipe.totalTimeMinutes })} · {t('common.steps', { count: recipe.steps.length })}</ThemedText>
        </View>
      </View>
      <AppButton label={t('common.viewRecipe')} variant="secondary" onPress={() => router.push(`/recipe/${recipe.recipeId}` as Href)} />
    </AppCard>
  ); })}</>;
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: { width: 44, height: 44, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
});
