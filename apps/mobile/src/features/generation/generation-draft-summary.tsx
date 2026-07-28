import { ThemedText } from '@/components/themed-text';
import type { P0State } from '@/state/p0-state';

export function GenerationDraftSummary({ state }: { readonly state: P0State }) {
  const cookware = state.generationDraft.cookware.length > 0 ? state.generationDraft.cookware.join('、') : '未选择';
  return <ThemedText>食材 {state.selectedIngredients.length} 种 · {state.generationDraft.servings} 人 · {state.generationDraft.maxTimeMinutes} 分钟 · 厨具：{cookware}</ThemedText>;
}
