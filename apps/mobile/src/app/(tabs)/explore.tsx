import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { fixtureRecipeRepository } from '@/data/fixtures/recipe-repository';
import { useP0Store } from '@/state/p0-store';

export default function ExploreScreen() {
  const { t } = useTranslation();
  const { state } = useP0Store();
  const recipes = [...Object.values(state.recipeCache), ...fixtureRecipeRepository.listAll().filter((fixture) => !state.recipeCache[fixture.recipeId])];
  const recentIds = new Set(state.recentRecipes.map((entry) => entry.recipeId));
  const recent = recipes.filter((recipe) => recentIds.has(recipe.recipeId));
  return <Screen><AppHeader title={t('explore.title')} eyebrow={t('explore.eyebrow')} /><ThemedText themeColor="textSecondary">{t('explore.subtitle')}</ThemedText><ThemedText type="sectionTitle">{t('explore.recent')}</ThemedText>{recent.length === 0 ? <StatusMessage message={t('explore.empty')} /> : recent.map((recipe) => <RecipeCard key={recipe.recipeId} title={recipe.title} description={t('explore.continue')} onPress={() => router.push(`/recipe/${recipe.recipeId}` as Href)} />)}<ThemedText type="sectionTitle">{t('explore.available')}</ThemedText>{recipes.map((recipe) => <RecipeCard key={recipe.recipeId} title={recipe.title} description={`${t('common.minutes', { count: recipe.totalTimeMinutes })} · ${t('common.steps', { count: recipe.steps.length })}`} onPress={() => router.push(`/recipe/${recipe.recipeId}` as Href)} />)}</Screen>;
}
function RecipeCard({ title, description, onPress }: { readonly title: string; readonly description: string; readonly onPress: () => void }) { const { t } = useTranslation(); return <AppCard><ThemedText type="subtitle">{title}</ThemedText><ThemedText type="small" themeColor="textSecondary">{description}</ThemedText><AppButton label={t('common.viewRecipe')} variant="secondary" onPress={onPress} /></AppCard>; }
