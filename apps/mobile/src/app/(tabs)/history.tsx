import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/app-button';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { environmentConfig } from '@/config/environment';
import { RemoteRecipeDataRepository } from '@/data/recipe-generation/remote-recipe-data-repository';
import { RecentRecipeList } from '@/features/history/recent-recipe-list';
import { useP0Store } from '@/state/p0-store';

export default function HistoryScreen() {
  const { t } = useTranslation(); const { state, cacheRecipe, addRecentRecipe } = useP0Store();
  const [attempt, setAttempt] = useState(0); const [hasLoaded, setHasLoaded] = useState(false); const [error, setError] = useState<string | null>(null);
  const repository = useMemo(() => environmentConfig.generationMode === 'remote' ? new RemoteRecipeDataRepository(environmentConfig.apiBaseUrl) : null, []);
  useEffect(() => { if (!repository) return; let active = true; const controller = new AbortController(); void repository.listHistory(state.guestId, controller.signal).then((history) => { if (!active) return; history.items.forEach((entry) => { cacheRecipe(entry.recipe); addRecentRecipe({ recipeId: entry.recipe.recipeId, viewedAt: entry.lastVisitedAt, source: entry.source }); }); setError(null); }).catch(() => { if (active) setError(t('history.refreshFailed')); }).finally(() => { if (active) setHasLoaded(true); }); return () => { active = false; controller.abort(); }; }, [addRecentRecipe, attempt, cacheRecipe, repository, state.guestId, t]);
  const hasEntries = state.recentRecipes.length > 0;
  return <Screen><AppHeader title={t('history.title')} eyebrow={t('history.eyebrow')} /><ThemedText themeColor="textSecondary">{repository ? t('history.remoteSubtitle') : t('history.localSubtitle')}</ThemedText>{repository && !hasLoaded && !hasEntries ? <StatusMessage message={t('history.loading')} /> : null}{error && !hasEntries ? <><StatusMessage message={error} tone="error" /><AppButton label={t('history.reload')} onPress={() => { setHasLoaded(false); setAttempt((value) => value + 1); }} /></> : null}{error && hasEntries ? <StatusMessage message={error} tone="warning" /> : null}{hasEntries ? <RecentRecipeList entries={state.recentRecipes} recipeCache={state.recipeCache} /> : hasLoaded && !error ? <RecentRecipeList entries={state.recentRecipes} recipeCache={state.recipeCache} /> : null}</Screen>;
}
