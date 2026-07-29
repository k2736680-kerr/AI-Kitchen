import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router, type Href } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { fixtureIngredientRepository } from '@/data/fixtures/ingredient-repository';
import { CustomIngredientForm } from '@/features/ingredients/custom-ingredient-form';
import { IngredientCategoryTabs } from '@/features/ingredients/ingredient-category-tabs';
import { IngredientGrid } from '@/features/ingredients/ingredient-grid';
import { IngredientSearch } from '@/features/ingredients/ingredient-search';
import { SelectedIngredientList } from '@/features/ingredients/selected-ingredient-list';
import { selectCanGenerate } from '@/state/p0-selectors';
import { useP0Store } from '@/state/p0-store';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { state, selectCatalogIngredient, addCustomIngredient, removeIngredient, clearSelectedIngredients, setSelectedCategory } = useP0Store();
  const [query, setQuery] = useState('');
  const ingredients = useMemo(() => fixtureIngredientRepository.search(query, state.uiPreferences.selectedCategory === 'all' ? undefined : state.uiPreferences.selectedCategory), [query, state.uiPreferences.selectedCategory]);
  const canGenerate = selectCanGenerate(state);
  return <Screen>
    <AppHeader title={t('home.title')} eyebrow={t('home.eyebrow')} />
    <ThemedText themeColor="textSecondary">{t('home.subtitle')}</ThemedText>
    <AppCard><ThemedText type="sectionTitle">{t('home.ingredients')}</ThemedText><IngredientCategoryTabs selected={state.uiPreferences.selectedCategory} onChange={setSelectedCategory} /><IngredientSearch value={query} onChange={setQuery} /><IngredientGrid ingredients={ingredients} selectedIds={state.selectedIngredients.map((item) => item.id)} onToggle={(ingredient) => selectCatalogIngredient(ingredient)} /></AppCard>
    <AppCard><CustomIngredientForm onAdd={addCustomIngredient} /></AppCard>
    <AppCard><ThemedText type="sectionTitle">{t('home.selectedIngredients', { count: state.selectedIngredients.length })}</ThemedText><SelectedIngredientList ingredients={state.selectedIngredients} onRemove={removeIngredient} />{canGenerate && <AppButton label={t('home.clearSelection')} variant="ghost" onPress={clearSelectedIngredients} />}{canGenerate && <AppButton label={t('home.generate')} onPress={() => router.push('/generate' as Href)} />}{!canGenerate && <StatusMessage message={t('home.noSelection')} />}</AppCard>
  </Screen>;
}
