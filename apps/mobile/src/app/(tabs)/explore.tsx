import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { HomeHero } from '@/components/home-hero';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';import { fixtureRecipeRepository } from '@/data/fixtures/recipe-repository';
import { useP0Store } from '@/state/p0-store';
import type { Recipe } from '@ai-kitchen/shared';

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
    const normalized = query.normalize('NFKC').trim().toLowerCase();
    return pool.filter((recipe) => {
      if (difficulty !== 'all' && recipe.difficulty !== difficulty) return false;
      if (maxTime !== 'all' && recipe.totalTimeMinutes > Number(maxTime)) return false;
      if (normalized && !recipe.title.toLowerCase().includes(normalized)) return false;
      return true;
    });
  }, [allRecipes, difficulty, favorites, maxTime, query, showFavorites]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const emptyMessage = showFavorites ? t('explore.favoritesEmpty') : t('explore.empty');

  return <Screen>
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
      {DIFFICULTY_OPTIONS.map((option) => (
        <FilterChip key={option} label={option === 'all' ? t('explore.all') : t(`recipe.${option}`)} selected={difficulty === option} onPress={() => setDifficulty(option)} />
      ))}
    </View>
    <View style={styles.filterRow}>
      <ThemedText type="small" themeColor="textSecondary">{t('explore.filterTime')}</ThemedText>
      {TIME_OPTIONS.map((option) => (
        <FilterChip key={option} label={option === 'all' ? t('explore.all') : t('common.minutes', { count: Number(option) })} selected={maxTime === option} onPress={() => setMaxTime(option)} />
      ))}
    </View>
    <AppButton
      label={showFavorites ? `${t('explore.favorites')} (${favorites.length})` : t('explore.favorites')}
      variant="secondary"
      onPress={() => setShowFavorites((value) => !value)}
    />
    {filtered.length === 0
      ? <StatusMessage message={emptyMessage} />
      : <FlatList
        data={filtered}
        keyExtractor={(recipe) => recipe.recipeId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ExploreRecipeCard recipe={item} />}
      />}
  </Screen>;
}

function FilterChip({ label, selected, onPress }: { readonly label: string; readonly selected: boolean; readonly onPress: () => void }) {
  const theme = useTheme();
  return <Pressable onPress={onPress} style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.surfaceTint }, selected && { borderColor: 'transparent', backgroundColor: theme.primary }]}>
    <ThemedText type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.text }}>{label}</ThemedText>
  </Pressable>;
}

function ExploreRecipeCard({ recipe }: { readonly recipe: Recipe }) {
  const { t } = useTranslation();
  return <AppCard>
    <ThemedText type="subtitle">{recipe.title}</ThemedText>
    <ThemedText type="small" themeColor="textSecondary">
      {t('common.minutes', { count: recipe.totalTimeMinutes })} · {t('common.steps', { count: recipe.steps.length })} · {t(`recipe.${recipe.difficulty}`)}
    </ThemedText>
    <AppButton label={t('common.viewRecipe')} variant="secondary" onPress={() => router.push(`/recipe/${recipe.recipeId}` as Href)} />
  </AppCard>;
}

const styles = StyleSheet.create({
  search: { borderRadius: Radius.input, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderRadius: Radius.chip, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.half },
  list: { gap: Spacing.sm, paddingTop: Spacing.md },
});
