import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/app-button';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { fixtureRecipeRepository } from '@/data/fixtures/recipe-repository';
import { environmentConfig } from '@/config/environment';
import { RemoteRecipeDataRepository } from '@/data/recipe-generation/remote-recipe-data-repository';
import { MissingIngredientNotice } from '@/features/recipes/missing-ingredient-notice';
import { RecipeHeader } from '@/features/recipes/recipe-header';
import { RecipeConstraintSummary } from '@/features/recipes/recipe-constraint-summary';
import { RecipeIngredientList } from '@/features/recipes/recipe-ingredient-list';
import { RecipeStepList } from '@/features/recipes/recipe-step-list';
import { SafetyNotice } from '@/features/recipes/safety-notice';
import { useP0Store } from '@/state/p0-store';

export default function RecipeDetailScreen() {
  const { t } = useTranslation();
  const { recipeId } = useLocalSearchParams<{ recipeId?: string }>();
  const { state, addRecentRecipe, cacheRecipe } = useP0Store();
  const [loadError, setLoadError] = useState<string | null>(null);
  const remoteData = useMemo(() => environmentConfig.generationMode === 'remote' ? new RemoteRecipeDataRepository(environmentConfig.apiBaseUrl) : null, []);
  const recipe = recipeId ? state.recipeCache[recipeId] ?? (remoteData ? undefined : fixtureRecipeRepository.getById(recipeId)) : undefined;
  const existingEntry = recipeId ? state.recentRecipes.find((entry) => entry.recipeId === recipeId) : undefined;
  const source = existingEntry?.source ?? (state.generation.recipeId === recipeId
    ? state.generation.source === 'provider' ? 'remote' : 'local'
    : 'fixture');

  useEffect(() => {
    if (!remoteData || !recipeId || recipe) return;
    let active = true;
    const controller = new AbortController();
    void remoteData.getRecipe(recipeId, controller.signal).then((remoteRecipe) => {
      if (active) {
        setLoadError(null);
        cacheRecipe(remoteRecipe);
      }
    }).catch(() => {
      if (active) setLoadError(t('recipe.notFoundHint'));
    });
    return () => { active = false; controller.abort(); };
  }, [cacheRecipe, recipe, recipeId, remoteData, t]);

  useEffect(() => {
    if (!recipe) return;
    addRecentRecipe({ recipeId: recipe.recipeId, viewedAt: new Date().toISOString(), source: existingEntry?.source ?? source });
    if (remoteData) void remoteData.recordVisit({ guestId: state.guestId, recipeId: recipe.recipeId, source: 'remote' }, new AbortController().signal).catch(() => undefined);
  }, [addRecentRecipe, existingEntry?.source, recipe, remoteData, source, state.guestId]);
  if (!recipe && remoteData && !loadError) return <Screen><AppHeader title={t('recipe.loading')} back /><StatusMessage message={t('recipe.loadingHint')} /></Screen>;
  if (!recipe) return <Screen><AppHeader title={t('recipe.notFound')} back /><StatusMessage message={loadError ?? t('recipe.notFoundHint')} tone="error" /><AppButton label={t('recipe.backToConditions')} onPress={() => router.replace('/generate' as Href)} /><AppButton label={t('common.home')} variant="secondary" onPress={() => router.replace('/' as Href)} /></Screen>;
  return <Screen><AppHeader title={t('common.appName')} back /><RecipeHeader recipe={recipe} source={source} selectedServings={state.generationDraft.servings} /><RecipeConstraintSummary recipe={recipe} /><RecipeIngredientList title={t('recipe.requiredIngredients')} ingredients={recipe.requiredIngredients} /><RecipeIngredientList title={t('recipe.optionalIngredients')} ingredients={recipe.optionalIngredients} /><MissingIngredientNotice ingredients={recipe.missingIngredients} /><RecipeStepList steps={recipe.steps} /><SafetyNotice notices={recipe.safetyNotices} /><AppButton label={t('recipe.startCooking')} disabled={recipe.steps.length === 0} onPress={() => router.push(`/cooking/${recipe.recipeId}` as Href)} /><AppButton label={t('recipe.backToConditions')} variant="secondary" onPress={() => router.replace('/generate' as Href)} /><AppButton label={t('common.home')} variant="ghost" onPress={() => router.replace('/' as Href)} /></Screen>;
}
