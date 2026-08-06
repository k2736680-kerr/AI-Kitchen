import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { IngredientDefinition } from '@ai-kitchen/shared';
import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { HomeHero } from '@/components/home-hero';
import { ScreenList } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { fixtureIngredientRepository } from '@/data/fixtures/ingredient-repository';
import { CustomIngredientForm } from '@/features/ingredients/custom-ingredient-form';
import { IngredientCategoryTabs } from '@/features/ingredients/ingredient-category-tabs';
import { IngredientGridItem } from '@/features/ingredients/ingredient-grid';
import { resolveIngredientLocale } from '@/features/ingredients/ingredient-presentation';
import { IngredientSearch } from '@/features/ingredients/ingredient-search';
import { SelectedIngredientList } from '@/features/ingredients/selected-ingredient-list';
import { selectCanGenerate } from '@/state/p0-selectors';
import { useP0Store } from '@/state/p0-store';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { state, toggleCatalogIngredient, addCustomIngredient, removeIngredient, clearSelectedIngredients, setSelectedCategory } = useP0Store();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const ingredientLocale = resolveIngredientLocale(i18n.language);
  const selectedIds = useMemo(() => new Set(state.selectedIngredients.map((item) => item.id)), [state.selectedIngredients]);
  const ingredients = useMemo(
    () => fixtureIngredientRepository.search(deferredQuery, state.uiPreferences.selectedCategory === 'all' ? undefined : state.uiPreferences.selectedCategory, ingredientLocale),
    [deferredQuery, ingredientLocale, state.uiPreferences.selectedCategory],
  );
  const canGenerate = selectCanGenerate(state);

  const renderIngredient = useCallback(
    ({ item }: { readonly item: IngredientDefinition }) => <IngredientGridItem ingredient={item} selected={selectedIds.has(item.id)} onToggle={toggleCatalogIngredient} />,
    [selectedIds, toggleCatalogIngredient],
  );

  return <ScreenList
    data={ingredients}
    keyExtractor={(ingredient) => ingredient.id}
    renderItem={renderIngredient}
    numColumns={2}
    columnWrapperStyle={styles.gridRow}
    initialNumToRender={8}
    maxToRenderPerBatch={8}
    updateCellsBatchingPeriod={40}
    windowSize={5}
    removeClippedSubviews
    ListHeaderComponent={<View style={styles.section}>
      <HomeHero eyebrow={t('home.eyebrow')} title={t('home.title')} subtitle={t('home.subtitle')} />
      <AppCard>
        <ThemedText type="sectionTitle">{t('home.ingredients')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{t('home.selectionHint')}</ThemedText>
        <IngredientCategoryTabs selected={state.uiPreferences.selectedCategory} onChange={setSelectedCategory} />
        <IngredientSearch value={query} onChange={setQuery} />
      </AppCard>
    </View>}
    ListEmptyComponent={<StatusMessage message={t('home.noResults')} />}
    ListFooterComponent={<View style={styles.section}>
      <AppCard><CustomIngredientForm onAdd={addCustomIngredient} /></AppCard>
      <AppCard>
        <ThemedText type="sectionTitle">{t('home.selectedIngredients', { count: state.selectedIngredients.length })}</ThemedText>
        <SelectedIngredientList ingredients={state.selectedIngredients} onRemove={removeIngredient} />
        {canGenerate ? <AppButton label={t('home.clearSelection')} variant="ghost" onPress={clearSelectedIngredients} /> : null}
        {canGenerate ? <AppButton label={t('home.generate')} onPress={() => router.push('/generate' as Href)} /> : <StatusMessage message={t('home.noSelection')} />}
      </AppCard>
    </View>}
  />;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.md, marginBottom: Spacing.md },
  gridRow: { gap: Spacing.sm, marginBottom: Spacing.sm },
});
