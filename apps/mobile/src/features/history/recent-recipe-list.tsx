import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import type { Recipe } from '@ai-kitchen/shared';
import { fixtureRecipeRepository } from '@/data/fixtures/recipe-repository';
import type { RecentRecipeEntry } from '@/state/p0-state';

export function RecentRecipeList({ entries, recipeCache }: { readonly entries: readonly RecentRecipeEntry[]; readonly recipeCache: Readonly<Record<string, Recipe>> }) {
  const { t } = useTranslation();
  if (entries.length === 0) return <StatusMessage message={t('history.empty')} />;
  return <>{entries.map((entry) => { const recipe = recipeCache[entry.recipeId] ?? fixtureRecipeRepository.getById(entry.recipeId); if (!recipe) return <StatusMessage key={entry.recipeId} message={t('history.unavailable')} tone="warning" />; return <AppCard key={entry.recipeId}><ThemedText type="subtitle">{recipe.title}</ThemedText><ThemedText type="small" themeColor="textSecondary">{t('common.minutes', { count: recipe.totalTimeMinutes })} · {t('common.steps', { count: recipe.steps.length })}</ThemedText><AppButton label={t('common.viewRecipe')} variant="secondary" onPress={() => router.push(`/recipe/${recipe.recipeId}` as Href)} /></AppCard>; })}</>;
}
