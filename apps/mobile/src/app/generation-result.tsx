import { router, type Href } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { useP0Store } from '@/state/p0-store';

export default function GenerationResultScreen() {
  const { state } = useP0Store();
  const message = state.generation.status === 'no-match'
    ? '没有找到同时满足当前食材、时间和厨具条件的菜谱。'
    : '这次没有生成出可查看的菜谱，请调整条件后再试。';

  return <Screen>
    <ThemedText type="title">暂时没有合适的菜谱</ThemedText>
    <AppCard>
      <StatusMessage message={message} tone="error" />
      <ThemedText>你可以减少限制、选择更多食材，或返回首页重新选择。</ThemedText>
    </AppCard>
    <AppButton label="调整生成条件" onPress={() => router.replace('/generate' as Href)} />
    <AppButton label="返回首页选择食材" variant="secondary" onPress={() => router.replace('/' as Href)} />
  </Screen>;
}
