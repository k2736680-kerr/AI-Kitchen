import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppButton } from '@/components/app-button';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
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
      if (active) setLoadError('暂时无法加载该菜谱，请返回历史记录后重试。');
    });
    return () => { active = false; controller.abort(); };
  }, [cacheRecipe, recipe, recipeId, remoteData]);

  useEffect(() => {
    if (!recipe) return;
    addRecentRecipe({ recipeId: recipe.recipeId, viewedAt: new Date().toISOString(), source: existingEntry?.source ?? source });
    if (remoteData) void remoteData.recordVisit({ guestId: state.guestId, recipeId: recipe.recipeId, source: 'remote' }, new AbortController().signal).catch(() => undefined);
  }, [addRecentRecipe, existingEntry?.source, recipe, remoteData, source, state.guestId]);
  if (!recipe && remoteData && !loadError) return <Screen><ThemedText type="title">正在加载菜谱</ThemedText><StatusMessage message="正在读取已保存的菜谱。" /></Screen>;
  if (!recipe) return <Screen><ThemedText type="title">未找到菜谱</ThemedText><StatusMessage message={loadError ?? '找不到请求的菜谱。'} tone="error" /><AppButton label="返回生成条件" onPress={() => router.replace('/generate' as Href)} /><AppButton label="返回首页" variant="secondary" onPress={() => router.replace('/' as Href)} /></Screen>;
  return <Screen><RecipeHeader recipe={recipe} source={source} selectedServings={state.generationDraft.servings} /><RecipeConstraintSummary recipe={recipe} /><RecipeIngredientList title="必需食材" ingredients={recipe.requiredIngredients} /><RecipeIngredientList title="可选食材" ingredients={recipe.optionalIngredients} /><MissingIngredientNotice ingredients={recipe.missingIngredients} /><RecipeStepList steps={recipe.steps} /><SafetyNotice notices={recipe.safetyNotices} /><StatusMessage message="营养信息暂不可用。" /><AppButton label="开始烹饪" disabled={recipe.steps.length === 0} onPress={() => router.push(`/cooking/${recipe.recipeId}` as Href)} /><StatusMessage message="烹饪进度仅保存在当前应用会话。" /><AppButton label="返回生成条件" variant="secondary" onPress={() => router.replace('/generate' as Href)} /><AppButton label="返回首页" variant="ghost" onPress={() => router.replace('/' as Href)} /></Screen>;
}
