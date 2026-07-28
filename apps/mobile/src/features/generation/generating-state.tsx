import { StyleSheet } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import type { P0State } from '@/state/p0-state';

export function GeneratingState({ state, onCancel }: { readonly state: P0State; readonly onCancel: () => void }) {
  return <AppCard>
    <ThemedText type="subtitle" style={styles.heading}>正在查找适合你的菜谱</ThemedText>
    <StatusMessage message="正在根据已选食材和生成条件处理，请稍候。" />
    <ThemedText>食材：{state.selectedIngredients.map((item) => item.displayName).join('、')}</ThemedText>
    <ThemedText>{state.generationDraft.servings} 人 · 最多 {state.generationDraft.maxTimeMinutes} 分钟</ThemedText>
    <AppButton label="取消生成" variant="secondary" onPress={onCancel} />
  </AppCard>;
}

const styles = StyleSheet.create({ heading: { fontSize: 22, lineHeight: 30 } });
