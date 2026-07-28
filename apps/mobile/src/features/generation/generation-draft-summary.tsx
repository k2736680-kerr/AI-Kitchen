import { ThemedText } from '@/components/themed-text';
import { ALLERGEN_LABELS, COOKWARE_LABELS, DIETARY_PREFERENCE_LABELS } from '@ai-kitchen/shared';
import type { P0State } from '@/state/p0-state';

export function GenerationDraftSummary({ state }: { readonly state: P0State }) {
  const cookware = state.generationDraft.availableTools.length > 0
    ? state.generationDraft.availableTools.map((item) => COOKWARE_LABELS[item]).join('、')
    : '未选择';
  const preferences = state.generationDraft.dietaryPreferences.map((item) => DIETARY_PREFERENCE_LABELS[item]).join('、') || '未设置';
  const allergens = state.generationDraft.allergens.map((item) => ALLERGEN_LABELS[item]).join('、') || '未设置';
  const excluded = state.generationDraft.excludedIngredients.length || 0;
  return <ThemedText>食材 {state.selectedIngredients.length} 种 · {state.generationDraft.servings} 人 · 最多 {state.generationDraft.maxCookingTimeMinutes} 分钟 · 厨具：{cookware}{'\n'}偏好：{preferences} · 过敏原：{allergens} · 忌口：{excluded} 项</ThemedText>;
}
