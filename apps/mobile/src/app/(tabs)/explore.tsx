import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import type { Recipe } from '@ai-kitchen/shared';
import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { EmptyState } from '@/components/empty-state';
import { HomeHero } from '@/components/home-hero';
import { ScreenList } from '@/components/screen';
import { SelectionChip } from '@/components/selection-chip';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { fixtureRecipeRepository } from '@/data/fixtures/recipe-repository';
import { useTheme } from '@/hooks/use-theme';
import { useP0Store } from '@/state/p0-store';

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
type TimeFilter = 'all' | '15' | '30' | '45';

const DIFFICULTY_OPTIONS: readonly DifficultyFilter[] = ['all', 'easy', 'medium', 'hard'];
const TIME_OPTIONS: readonly TimeFilter[] = ['all', '15', '30', '45'];

export default function ExploreScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { state } = useP0Store();
  const locale = i18n.language === 'en-US' ? 'en-US' : 'zh-CN';
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [maxTime, setMaxTime] = useState<TimeFilter>('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const allRecipes = useMemo(() => {
    const cached = Object.values(state.recipeCache).filter((recipe) => recipe.locale === locale);
    const fixtures = fixtureRecipeRepository.listAll().filter((fixture) => fixture.locale === locale && !state.recipeCache[fixture.recipeId]);
    return [...cached, ...fixtures];
  }, [locale, state.recipeCache]);

  const favorites = useMemo(
    () => allRecipes.filter((recipe) => state.favoriteRecipeIds.includes(recipe.recipeId)),
    [allRecipes, state.favoriteRecipeIds],
  );

  const filtered = useMemo(() => {
    const pool = showFavorites ? favorites : allRecipes;
    const normalized = deferredQuery.normalize('NFKC').trim().toLowerCase();
    return pool.filter((recipe) => {
      if (difficulty !== 'all' && recipe.difficulty !== difficulty) return false;
      if (maxTime !== 'all' && recipe.totalTimeMinutes > Number(maxTime)) return false;
      return !normalized || recipe.title.toLowerCase().includes(normalized);
    });
  }, [allRecipes, deferredQuery, difficulty, favorites, maxTime, showFavorites]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 350);
  }, []);

  const renderRecipe = useCallback(({ item }: { readonly item: Recipe }) => <ExploreRecipeCard recipe={item} />, []);
  const emptyMessage = showFavorites ? t('explore.favoritesEmpty') : t('explore.empty');

  return <ScreenList
    data={filtered}
    keyExtractor={(recipe) => recipe.recipeId}
    renderItem={renderRecipe}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
    initialNumToRender={6}
    maxToRenderPerBatch={6}
    updateCellsBatchingPeriod={50}
    windowSize={5}
    removeClippedSubviews
    ListHeaderComponent={<View style={styles.header}>
      <HomeHero eyebrow={t('explore.eyebrow')} title={t('explore.title')} subtitle={t('explore.subtitle')} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('explore.searchPlaceholder')}
        placeholderTextColor={theme.textWeak}
        style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
      />
      <View style={styles.filterRow}>
        <ThemedText type="small" themeColor="textSecondary">{t('explore.filterDifficulty')}</ThemedText>
        {DIFFICULTY_OPTIONS.map((option) => <SelectionChip key={option} label={option === 'all' ? t('explore.all') : t(`recipe.${option}`)} selected={difficulty === option} role="radio" onPress={() => setDifficulty(option)} />)}
      </View>
      <View style={styles.filterRow}>
        <ThemedText type="small" themeColor="textSecondary">{t('explore.filterTime')}</ThemedText>
        {TIME_OPTIONS.map((option) => <SelectionChip key={option} label={option === 'all' ? t('explore.all') : t('common.minutes', { count: Number(option) })} selected={maxTime === option} role="radio" onPress={() => setMaxTime(option)} />)}
      </View>
      <AppButton label={showFavorites ? `${t('explore.favorites')} (${favorites.length})` : t('explore.favorites')} variant="secondary" onPress={() => setShowFavorites((value) => !value)} />
    </View>}
    ListEmptyComponent={<EmptyState icon={showFavorites ? '♡' : '🍲'} title={emptyMessage} />}
  />;
}

const ExploreRecipeCard = memo(function ExploreRecipeCard({ recipe }: { readonly recipe: Recipe }) {
  const { t } = useTranslation();
  return <AppCard>
    <ThemedText type="subtitle">{recipe.title}</ThemedText>
    <ThemedText type="small" themeColor="textSecondary">
      {t('common.minutes', { count: recipe.totalTimeMinutes })} · {t('common.steps', { count: recipe.steps.length })} · {t(`recipe.${recipe.difficulty}`)}
    </ThemedText>
    <AppButton label={t('common.viewRecipe')} variant="secondary" onPress={() => router.push(`/recipe/${recipe.recipeId}` as Href)} />
  </AppCard>;
});

const styles = StyleSheet.create({
  header: { gap: Spacing.md, marginBottom: Spacing.md },
  search: { minHeight: 48, borderRadius: Radius.input, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
});
