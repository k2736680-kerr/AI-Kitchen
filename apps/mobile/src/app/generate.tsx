import { useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { DIETARY_PREFERENCE_LABELS, ALLERGEN_LABELS, type AllergenCode, type DietaryPreference } from '@ai-kitchen/shared';
import { fixtureIngredientRepository } from '@/data/fixtures/ingredient-repository';
import { CookwareSelector } from '@/features/generation/cookware-selector';
import { GenerationDraftSummary } from '@/features/generation/generation-draft-summary';
import { MultiOptionSelector } from '@/features/generation/multi-option-selector';
import { ServingSelector } from '@/features/generation/serving-selector';
import { TimeSelector } from '@/features/generation/time-selector';
import { selectGenerationValidation } from '@/state/p0-selectors';
import { useP0Store } from '@/state/p0-store';

export default function GenerateScreen() {
  const {
    state,
    setServings,
    setMaxTime,
    toggleCookware,
    toggleDietaryPreference,
    toggleAllergen,
    toggleExcludedIngredient,
    clearDietaryPreferences,
    clearAllergens,
    clearExcludedIngredients,
    startGeneration,
  } = useP0Store();
  const submitLock = useRef(false);
  const validation = selectGenerationValidation(state);
  const hasIngredients = state.selectedIngredients.length > 0;
  const submitDisabled = state.generation.status === 'generating';

  useFocusEffect(useCallback(() => {
    submitLock.current = false;
  }, []));

  const submit = () => {
    if (!validation.canSubmit || submitLock.current || submitDisabled) return;
    submitLock.current = true;
    startGeneration(`local-generation:${Date.now().toString(36)}`);
    router.push('/generating' as Href);
  };

  return <Screen>
    <ThemedText type="title" style={styles.title}>生成条件</ThemedText>
    <AppCard>
      <ThemedText type="subtitle" style={styles.heading}>已选食材（{state.selectedIngredients.length}）</ThemedText>
      <ThemedText>{hasIngredients ? state.selectedIngredients.map((item) => item.displayName).join('、') : '暂无食材'}</ThemedText>
      {!hasIngredients && <StatusMessage message="请先返回首页选择至少一种食材。" tone="error" />}
    </AppCard>
    <AppCard>
      <ThemedText type="subtitle" style={styles.heading}>人数</ThemedText>
      <ServingSelector value={state.generationDraft.servings} onChange={setServings} />
      <ThemedText type="subtitle" style={styles.heading}>最大烹饪时间</ThemedText>
      <TimeSelector value={state.generationDraft.maxCookingTimeMinutes} onChange={setMaxTime} />
      <ThemedText type="subtitle" style={styles.heading}>可用厨具（可选）</ThemedText>
      <CookwareSelector selected={state.generationDraft.availableTools} onToggle={toggleCookware} />
    </AppCard>
    <AppCard>
      <ThemedText type="subtitle" style={styles.heading}>饮食偏好（可选）</ThemedText>
      <ThemedText>偏好用于筛选结果，过敏原和忌口优先级更高。</ThemedText>
      <MultiOptionSelector<DietaryPreference>
        options={Object.entries(DIETARY_PREFERENCE_LABELS).map(([value, label]) => ({ value: value as DietaryPreference, label }))}
        selected={state.generationDraft.dietaryPreferences}
        onToggle={toggleDietaryPreference}
      />
      {state.generationDraft.dietaryPreferences.length > 0 && <AppButton label="清除饮食偏好" variant="ghost" onPress={clearDietaryPreferences} />}
    </AppCard>
    <AppCard>
      <ThemedText type="subtitle" style={styles.heading}>过敏原（可选）</ThemedText>
      <ThemedText>请选择你需要避开的已知过敏原。</ThemedText>
      <MultiOptionSelector<AllergenCode>
        options={Object.entries(ALLERGEN_LABELS).map(([value, label]) => ({ value: value as AllergenCode, label }))}
        selected={state.generationDraft.allergens}
        onToggle={toggleAllergen}
      />
      {state.generationDraft.allergens.length > 0 && <AppButton label="清除过敏原" variant="ghost" onPress={clearAllergens} />}
    </AppCard>
    <AppCard>
      <ThemedText type="subtitle" style={styles.heading}>忌口食材（可选）</ThemedText>
      <ThemedText>选择后，菜谱中的对应食材会被排除。</ThemedText>
      <MultiOptionSelector
        options={fixtureIngredientRepository.listAll().map((ingredient) => ({ value: ingredient.id, label: ingredient.displayName }))}
        selected={state.generationDraft.excludedIngredients}
        onToggle={toggleExcludedIngredient}
      />
      {state.generationDraft.excludedIngredients.length > 0 && <AppButton label="清除忌口" variant="ghost" onPress={clearExcludedIngredients} />}
    </AppCard>
    <AppCard>
      <ThemedText type="subtitle" style={styles.heading}>生成摘要</ThemedText>
      <GenerationDraftSummary state={state} />
      <StatusMessage message="确认条件后，将根据当前食材查找可用菜谱。" />
      {validation.messages.map((message) => <StatusMessage key={message} message={message} tone="error" />)}
    </AppCard>
    <AppButton label="返回修改食材" variant="secondary" onPress={() => router.back()} />
    <AppButton label="生成菜谱" disabled={!validation.canSubmit || submitDisabled} onPress={submit} />
  </Screen>;
}

const styles = StyleSheet.create({ title: { fontSize: 36, lineHeight: 44 }, heading: { fontSize: 20, lineHeight: 28 } });
