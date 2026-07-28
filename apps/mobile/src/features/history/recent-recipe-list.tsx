import { router, type Href } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { fixtureRecipeRepository } from '@/data/fixtures/recipe-repository';
import type { RecentRecipeEntry } from '@/state/p0-state';

export function RecentRecipeList({ entries }: { readonly entries: readonly RecentRecipeEntry[] }) {
  if (entries.length === 0) {
    return <StatusMessage message="还没有历史记录，先从首页生成或查看一份菜谱吧。" />;
  }

  return <>
    {entries.map((entry) => {
      const recipe = fixtureRecipeRepository.getById(entry.recipeId);
      if (!recipe) return <StatusMessage key={entry.recipeId} message="有一条菜谱记录暂时无法打开。" tone="error" />;
      return <AppCard key={entry.recipeId}>
        <ThemedText type="subtitle">{recipe.title}</ThemedText>
        <ThemedText>{recipe.totalTimeMinutes} 分钟 · {recipe.steps.length} 个步骤</ThemedText>
        <AppButton label="查看菜谱" variant="secondary" onPress={() => router.push(`/recipe/${recipe.recipeId}` as Href)} />
      </AppCard>;
    })}
  </>;
}
