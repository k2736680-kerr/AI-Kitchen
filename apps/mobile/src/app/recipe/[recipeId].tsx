import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppButton } from '@/components/app-button';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { fixtureRecipeRepository } from '@/data/fixtures/recipe-repository';
import { MissingIngredientNotice } from '@/features/recipes/missing-ingredient-notice';
import { RecipeHeader } from '@/features/recipes/recipe-header';
import { RecipeConstraintSummary } from '@/features/recipes/recipe-constraint-summary';
import { RecipeIngredientList } from '@/features/recipes/recipe-ingredient-list';
import { RecipeStepList } from '@/features/recipes/recipe-step-list';
import { SafetyNotice } from '@/features/recipes/safety-notice';
import { useP0Store } from '@/state/p0-store';

export default function RecipeDetailScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId?: string }>();
  const { state, addRecentRecipe } = useP0Store();
  const recipe = recipeId ? fixtureRecipeRepository.getById(recipeId) : undefined;
  useEffect(() => {
    if (recipe) addRecentRecipe({ recipeId: recipe.recipeId, viewedAt: new Date().toISOString(), source: 'fixture' });
  }, [addRecentRecipe, recipe]);
  if (!recipe) return <Screen><ThemedText type="title">未找到菜谱</ThemedText><StatusMessage message="找不到请求的菜谱。" tone="error" /><AppButton label="返回生成条件" onPress={() => router.replace('/generate' as Href)} /><AppButton label="返回首页" variant="secondary" onPress={() => router.replace('/' as Href)} /></Screen>;
  return <Screen><RecipeHeader recipe={recipe} selectedServings={state.generationDraft.servings} /><RecipeConstraintSummary recipe={recipe} /><RecipeIngredientList title="必需食材" ingredients={recipe.requiredIngredients} /><RecipeIngredientList title="可选食材" ingredients={recipe.optionalIngredients} /><MissingIngredientNotice ingredients={recipe.missingIngredients} /><RecipeStepList steps={recipe.steps} /><SafetyNotice notices={recipe.safetyNotices} /><StatusMessage message="营养信息暂不可用。" /><AppButton label="开始烹饪" disabled={recipe.steps.length === 0} onPress={() => router.push(`/cooking/${recipe.recipeId}` as Href)} /><StatusMessage message="烹饪进度仅保存在当前应用会话。" /><AppButton label="返回生成条件" variant="secondary" onPress={() => router.replace('/generate' as Href)} /><AppButton label="返回首页" variant="ghost" onPress={() => router.replace('/' as Href)} /></Screen>;
}
