import { StyleSheet } from 'react-native';
import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import type { P0State } from '@/state/p0-state';

export function GeneratingState({ state, attempt, onCancel }: { readonly state: P0State; readonly attempt: number; readonly onCancel: () => void }) {
  return <AppCard><ThemedText type="subtitle" style={styles.heading}>正在准备固定菜谱</ThemedText><StatusMessage message="P0 固定演示数据，不请求网络或 AI" /><ThemedText>食材：{state.selectedIngredients.map((item) => item.displayName).join('、')}</ThemedText><ThemedText>{state.generationDraft.servings} 人 · {state.generationDraft.maxTimeMinutes} 分钟</ThemedText><ThemedText>正在加载（第 {attempt} 次）</ThemedText><AppButton label="取消生成" variant="secondary" onPress={onCancel} /></AppCard>;
}
const styles = StyleSheet.create({ heading: { fontSize: 22, lineHeight: 30 } });
