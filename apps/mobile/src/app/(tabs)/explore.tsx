import { router, type Href } from 'expo-router';
import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { fixtureRecipeRepository } from '@/data/fixtures/recipe-repository';
import { useP0Store } from '@/state/p0-store';

export default function ExploreScreen() {
  const { state } = useP0Store();
  const recipes = fixtureRecipeRepository.listAll();
  const recentIds = new Set(state.recentRecipes.map((entry) => entry.recipeId));
  const recent = recipes.filter((recipe) => recentIds.has(recipe.recipeId));
  return (
    <Screen>
      <ThemedText type="title">探索菜谱</ThemedText>
      <ThemedText>浏览当前可用的固定菜谱，并继续最近查看的内容。</ThemedText>
      <StatusMessage message="菜谱和最近记录仅保存在当前应用会话，尚未接入云端历史。" />
      <ThemedText type="subtitle">最近菜谱</ThemedText>
      {recent.length === 0 ? <StatusMessage message="还没有最近菜谱，先从首页生成一份菜谱吧。" /> : recent.map((recipe) => <RecipeCard key={recipe.recipeId} title={recipe.title} description="继续查看这份菜谱" onPress={() => router.push(`/recipe/${recipe.recipeId}` as Href)} />)}
      <ThemedText type="subtitle">固定菜谱</ThemedText>
      {recipes.map((recipe) => <RecipeCard key={recipe.recipeId} title={recipe.title} description={`${recipe.totalTimeMinutes} 分钟 · ${recipe.steps.length} 个步骤`} onPress={() => router.push(`/recipe/${recipe.recipeId}` as Href)} />)}
    </Screen>
  );
}

function RecipeCard({ title, description, onPress }: { readonly title: string; readonly description: string; readonly onPress: () => void }) {
  return <AppCard><ThemedText type="subtitle">{title}</ThemedText><ThemedText>{description}</ThemedText><AppButton label="查看菜谱" variant="secondary" onPress={onPress} /></AppCard>;
}
