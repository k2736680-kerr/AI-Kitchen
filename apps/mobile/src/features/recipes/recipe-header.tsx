import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import type { RecipeFixture } from '@ai-kitchen/shared';
import { RecipeSourceBadge } from './recipe-source-badge';

export function RecipeHeader({ recipe, selectedServings }: { readonly recipe: RecipeFixture; readonly selectedServings: number }) {
  return <><ThemedText type="title" style={styles.title}>{recipe.title}</ThemedText><ThemedText>{recipe.description}</ThemedText><ThemedText>{recipe.totalTimeMinutes} 分钟 · 基准 {recipe.servings} 人</ThemedText><RecipeSourceBadge />{selectedServings !== recipe.servings && <ThemedText>当前选择为 {selectedServings} 人，食材用量按基准人数显示。</ThemedText>}</>;
}
const styles = StyleSheet.create({ title: { fontSize: 34, lineHeight: 42 } });
