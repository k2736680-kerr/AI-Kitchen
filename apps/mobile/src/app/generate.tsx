import { useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { CookwareSelector } from '@/features/generation/cookware-selector';
import { GenerationDraftSummary } from '@/features/generation/generation-draft-summary';
import { ServingSelector } from '@/features/generation/serving-selector';
import { TimeSelector } from '@/features/generation/time-selector';
import { selectCanGenerate } from '@/state/p0-selectors';
import { useP0Store } from '@/state/p0-store';

export default function GenerateScreen() {
  const { state, setServings, setMaxTime, toggleCookware, startGeneration } = useP0Store();
  const submitLock = useRef(false);
  const hasIngredients = selectCanGenerate(state);
  const submitDisabled = state.generation.status === 'generating';

  useFocusEffect(useCallback(() => {
    submitLock.current = false;
  }, []));

  const submit = () => {
    if (!hasIngredients || submitLock.current || submitDisabled) return;
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
      <TimeSelector value={state.generationDraft.maxTimeMinutes} onChange={setMaxTime} />
      <ThemedText type="subtitle" style={styles.heading}>可用厨具（可选）</ThemedText>
      <CookwareSelector selected={state.generationDraft.cookware} onToggle={toggleCookware} />
    </AppCard>
    <AppCard>
      <ThemedText type="subtitle" style={styles.heading}>生成摘要</ThemedText>
      <GenerationDraftSummary state={state} />
      <StatusMessage message="确认条件后，将根据当前食材查找可用菜谱。" />
    </AppCard>
    <AppButton label="返回修改食材" variant="secondary" onPress={() => router.back()} />
    <AppButton label="生成菜谱" disabled={!hasIngredients || submitDisabled} onPress={submit} />
  </Screen>;
}

const styles = StyleSheet.create({ title: { fontSize: 36, lineHeight: 44 }, heading: { fontSize: 20, lineHeight: 28 } });
