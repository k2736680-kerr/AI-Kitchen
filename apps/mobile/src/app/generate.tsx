import { router, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { CookwareSelector } from '@/features/generation/cookware-selector';
import { GenerationDraftSummary } from '@/features/generation/generation-draft-summary';
import { ServingSelector } from '@/features/generation/serving-selector';
import { TimeSelector } from '@/features/generation/time-selector';
import { useP0Store } from '@/state/p0-store';

export default function GenerateScreen() {
  const { state, setServings, setMaxTime, toggleCookware } = useP0Store();
  const hasIngredients = state.selectedIngredients.length > 0;
  return <Screen><ThemedText type="title" style={styles.title}>生成条件</ThemedText><AppCard><ThemedText type="subtitle" style={styles.heading}>已选食材（{state.selectedIngredients.length}）</ThemedText><ThemedText>{hasIngredients ? state.selectedIngredients.map((item) => item.displayName).join('、') : '暂无食材'}</ThemedText>{!hasIngredients && <StatusMessage message="请先回到首页选择至少一种食材" tone="error" />}</AppCard><AppCard><ThemedText type="subtitle" style={styles.heading}>人数</ThemedText><ServingSelector value={state.generationDraft.servings} onChange={setServings} /><ThemedText type="subtitle" style={styles.heading}>最大时间</ThemedText><TimeSelector value={state.generationDraft.maxTimeMinutes} onChange={setMaxTime} /><ThemedText type="subtitle" style={styles.heading}>厨具（可选）</ThemedText><CookwareSelector selected={state.generationDraft.cookware} onToggle={toggleCookware} /></AppCard><AppCard><ThemedText type="subtitle" style={styles.heading}>草稿摘要</ThemedText><GenerationDraftSummary state={state} /><StatusMessage message="下一步将进入固定数据生成演示" /></AppCard><AppButton label="返回修改食材" variant="secondary" onPress={() => router.back()} /><AppButton label="开始固定生成演示" disabled={!hasIngredients} onPress={() => router.push('/generating' as Href)} /><AppButton label="演示失败与重试" variant="secondary" disabled={!hasIngredients} onPress={() => router.push('/generating?scenario=fail-once' as Href)} /></Screen>;
}

const styles = StyleSheet.create({ title: { fontSize: 36, lineHeight: 44 }, heading: { fontSize: 20, lineHeight: 28 } });
