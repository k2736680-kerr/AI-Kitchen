import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { router, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Recipe } from '@ai-kitchen/shared';
import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { EmptyState } from '@/components/empty-state';
import { HomeHero } from '@/components/home-hero';
import { ScreenList } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { environmentConfig } from '@/config/environment';
import { Radius, Spacing } from '@/constants/theme';
import { fixtureRecipeRepository } from '@/data/fixtures/recipe-repository';
import { RemoteRecipeDataRepository } from '@/data/recipe-generation/remote-recipe-data-repository';
import { useTheme } from '@/hooks/use-theme';
import type { RecentRecipeEntry } from '@/state/p0-state';
import { useP0Store } from '@/state/p0-store';

export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const { state, cacheRecipe, addRecentRecipe } = useP0Store();
  const locale = i18n.language === 'en-US' ? 'en-US' : 'zh-CN';
  const [attempt, setAttempt] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(environmentConfig.generationMode === 'local');
  const [error, setError] = useState<string | null>(null);
  const repository = useMemo(() => environmentConfig.generationMode === 'remote' ? new RemoteRecipeDataRepository(environmentConfig.apiBaseUrl) : null, []);
  const entries = useMemo(() => state.recentRecipes.filter((entry) => entry.locale === locale), [locale, state.recentRecipes]);

  useEffect(() => {
    if (!repository || state.identityStatus !== 'ready') return;
    let active = true;
    const controller = new AbortController();
    void repository.listHistory(locale, controller.signal).then((history) => {
      if (!active) return;
      history.items.forEach((entry) => {
        cacheRecipe(entry.recipe);
        addRecentRecipe({ recipeId: entry.recipe.recipeId, viewedAt: entry.lastVisitedAt, source: entry.source, locale: entry.recipe.locale });
      });
      setError(null);
    }).catch(() => {
      if (active) setError(t('history.refreshFailed'));
    }).finally(() => {
      if (active) setHasLoaded(true);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [addRecentRecipe, attempt, cacheRecipe, locale, repository, state.identityStatus, t]);

  const renderEntry = useCallback(
    ({ item }: { readonly item: RecentRecipeEntry }) => <HistoryRecipeCard entry={item} recipe={state.recipeCache[item.recipeId] ?? fixtureRecipeRepository.getById(item.recipeId)} />,
    [state.recipeCache],
  );

  return <ScreenList
    data={entries}
    keyExtractor={(entry) => `${entry.recipeId}:${entry.viewedAt}`}
    renderItem={renderEntry}
    initialNumToRender={6}
    maxToRenderPerBatch={6}
    windowSize={5}
    removeClippedSubviews
    ListHeaderComponent={<View style={styles.header}>
      <HomeHero eyebrow={t('history.eyebrow')} title={t('history.title')} subtitle={repository ? t('history.remoteSubtitle') : t('history.localSubtitle')} />
      {repository && !hasLoaded && entries.length === 0 ? <StatusMessage message={t('history.loading')} /> : null}
      {error ? <StatusMessage message={error} tone={entries.length === 0 ? 'error' : 'warning'} /> : null}
      {error && entries.length === 0 ? <AppButton label={t('history.reload')} onPress={() => { setHasLoaded(false); setAttempt((value) => value + 1); }} /> : null}
    </View>}
    ListEmptyComponent={hasLoaded && !error ? <EmptyState icon="🍽️" title={t('history.empty')} actionLabel={t('history.goGenerate')} onAction={() => router.replace('/' as Href)} /> : null}
  />;
}

const HistoryRecipeCard = memo(function HistoryRecipeCard({ entry, recipe }: { readonly entry: RecentRecipeEntry; readonly recipe?: Recipe }) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (!recipe) return <StatusMessage message={t('history.unavailable')} tone="warning" />;
  return <AppCard>
    <View style={styles.headRow}>
      <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}><ThemedText style={styles.emoji}>🍲</ThemedText></LinearGradient>
      <View style={styles.copy}>
        <ThemedText type="subtitle">{recipe.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{t('common.minutes', { count: recipe.totalTimeMinutes })} · {t('common.steps', { count: recipe.steps.length })}</ThemedText>
      </View>
    </View>
    <AppButton label={t('common.viewRecipe')} variant="secondary" onPress={() => router.push(`/recipe/${entry.recipeId}` as Href)} />
  </AppCard>;
});

const styles = StyleSheet.create({
  header: { gap: Spacing.md, marginBottom: Spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: { width: 44, height: 44, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 18 },
  copy: { flex: 1, gap: 2 },
});
