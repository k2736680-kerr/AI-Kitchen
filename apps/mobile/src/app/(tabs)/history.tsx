import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { RecentRecipeList } from '@/features/history/recent-recipe-list';
import { useP0Store } from '@/state/p0-store';

export default function HistoryScreen() {
  const { state } = useP0Store();
  return <Screen>
    <ThemedText type="title">历史</ThemedText>
    <ThemedText>查看本次应用会话中生成或打开过的菜谱。</ThemedText>
    <RecentRecipeList entries={state.recentRecipes} />
  </Screen>;
}
