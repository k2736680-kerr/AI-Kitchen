import { useEffect, useMemo, useState } from 'react';

import { AppButton } from '@/components/app-button';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { environmentConfig } from '@/config/environment';
import { RemoteRecipeDataRepository } from '@/data/recipe-generation/remote-recipe-data-repository';
import { RecentRecipeList } from '@/features/history/recent-recipe-list';
import { useP0Store } from '@/state/p0-store';

export default function HistoryScreen() {
  const { state, cacheRecipe, addRecentRecipe } = useP0Store();
  const [attempt, setAttempt] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const repository = useMemo(() => environmentConfig.generationMode === 'remote' ? new RemoteRecipeDataRepository(environmentConfig.apiBaseUrl) : null, []);

  useEffect(() => {
    if (!repository) return;
    let active = true;
    const controller = new AbortController();
    void repository.listHistory(state.guestId, controller.signal).then((history) => {
      if (!active) return;
      history.items.forEach((entry) => {
        cacheRecipe(entry.recipe);
        addRecentRecipe({ recipeId: entry.recipe.recipeId, viewedAt: entry.lastVisitedAt, source: entry.source });
      });
      setError(null);
    }).catch(() => {
      if (active) setError('暂时无法加载历史记录，请稍后重试。');
    }).finally(() => {
      if (active) setHasLoaded(true);
    });
    return () => { active = false; controller.abort(); };
  }, [addRecentRecipe, attempt, cacheRecipe, repository, state.guestId]);

  return <Screen>
    <ThemedText type="title">历史</ThemedText>
    <ThemedText>{repository ? '查看已保存的最近菜谱。' : '查看本次应用会话中生成或打开过的菜谱。'}</ThemedText>
    {repository && !hasLoaded && !error ? <StatusMessage message="正在加载历史记录。" /> : null}
    {error ? <><StatusMessage message={error} tone="error" /><AppButton label="重新加载" onPress={() => { setHasLoaded(false); setAttempt((value) => value + 1); }} /></> : null}
    <RecentRecipeList entries={state.recentRecipes} recipeCache={state.recipeCache} />
  </Screen>;
}
