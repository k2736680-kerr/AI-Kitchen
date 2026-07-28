import { StyleSheet } from 'react-native';
import { ALLERGEN_LABELS, DIETARY_PREFERENCE_LABELS, type RecipeFixture } from '@ai-kitchen/shared';

import { AppCard } from '@/components/app-card';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';

export function RecipeConstraintSummary({ recipe }: { readonly recipe: RecipeFixture }) {
  const tags = recipe.dietaryTags.map((tag) => DIETARY_PREFERENCE_LABELS[tag]).join('、');
  const allergens = recipe.allergenCodes.map((allergen) => ALLERGEN_LABELS[allergen]).join('、');
  return <AppCard>
    <ThemedText type="subtitle" style={styles.heading}>饮食与安全提示</ThemedText>
    <ThemedText>饮食标签：{tags || '暂无特别标签'}</ThemedText>
    {allergens ? <StatusMessage message={`本菜谱包含：${allergens}。请核对包装标签、交叉接触风险和个人情况。`} tone="error" /> : <StatusMessage message="未记录明确过敏原；仍请根据包装标签和个人情况自行核对。" />}
  </AppCard>;
}

const styles = StyleSheet.create({ heading: { fontSize: 20, lineHeight: 28 } });
