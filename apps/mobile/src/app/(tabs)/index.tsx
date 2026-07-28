import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
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
  const { state, selectCatalogIngredient, addCustomIngredient, removeIngredient, setSelectedCategory } = useP0Store();
  const [query, setQuery] = useState('');
  const ingredients = useMemo(() => fixtureIngredientRepository.search(query, state.uiPreferences.selectedCategory === 'all' ? undefined : state.uiPreferences.selectedCategory), [query, state.uiPreferences.selectedCategory]);
  const canGenerate = selectCanGenerate(state);
  return <Screen>
    <ThemedText type="title" style={styles.title}>AI Kitchen</ThemedText>
    <ThemedText type="subtitle">用现有食材，快速规划一顿饭</ThemedText>
    <StatusMessage message="当前为 P0 固定数据演示，未接入 AI 或云端账户" />
    <AppCard><ThemedText type="subtitle" style={styles.heading}>选择食材</ThemedText><IngredientCategoryTabs selected={state.uiPreferences.selectedCategory} onChange={setSelectedCategory} /><IngredientSearch value={query} onChange={setQuery} /><IngredientGrid ingredients={ingredients} selectedIds={state.selectedIngredients.map((item) => item.id)} onToggle={(ingredient) => selectCatalogIngredient(ingredient)} /></AppCard>
    <AppCard><CustomIngredientForm onAdd={addCustomIngredient} /></AppCard>
    <AppCard><ThemedText type="subtitle" style={styles.heading}>已选择 {state.selectedIngredients.length} 种食材</ThemedText><SelectedIngredientList ingredients={state.selectedIngredients} onRemove={removeIngredient} />{canGenerate && <AppButton label="设置生成条件" onPress={() => router.push('/generate' as Href)} />}{!canGenerate && <StatusMessage message="至少选择一种食材后才能继续" />}</AppCard>
  </Screen>;
}

const styles = StyleSheet.create({ title: { fontSize: 40, lineHeight: 46 }, heading: { fontSize: 22, lineHeight: 30 } });
