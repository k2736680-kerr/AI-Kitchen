import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import type { RecipeFixture } from '@ai-kitchen/shared';
import { RecipeSourceBadge } from './recipe-source-badge';

export function RecipeHeader({ recipe, selectedServings, source }: { readonly recipe: RecipeFixture; readonly selectedServings: number; readonly source?: 'local' | 'remote' | 'fixture' }) {
  const { t } = useTranslation();
  const difficulty = t(recipe.difficulty === 'easy' ? 'recipe.easy' : 'recipe.medium');
  return <><ThemedText type="title" style={styles.title}>{recipe.title}</ThemedText><ThemedText themeColor="textSecondary">{recipe.description}</ThemedText><ThemedText type="small" themeColor="textSecondary">{t('recipe.timeServings', { time: t('common.minutes', { count: recipe.totalTimeMinutes }), servings: recipe.servings, difficulty })}</ThemedText><RecipeSourceBadge source={source} />{selectedServings !== recipe.servings && <ThemedText type="small" themeColor="textSecondary">{t('recipe.servingsNotice', { count: selectedServings })}</ThemedText>}</>;
}
const styles = StyleSheet.create({ title: { fontSize: 34, lineHeight: 42 } });
