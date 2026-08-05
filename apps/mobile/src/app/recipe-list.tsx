import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/app-button';
import { AppHeader } from '@/components/app-header';
import { AppCard } from '@/components/app-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useP0Store } from '@/state/p0-store';

const METHOD_LABEL: Readonly<Record<string, string>> = {
  'stir-fry': '炒',
  stew: '炖',
  steam: '蒸',
  soup: '汤',
  cold: '凉拌',
  roast: '烤',
};

const CUISINE_LABEL: Readonly<Record<string, string>> = {
  sichuan: '川菜',
  cantonese: '粤菜',
  hunan: '湘菜',
  jiangsu: '苏菜',
  zhejiang: '浙菜',
  northeastern: '东北菜',
  shandong: '鲁菜',
  western: '西式',
  japanese: '日式',
  korean: '韩式',
  other: '家常',
};

const FLAVOR_LABEL: Readonly<Record<string, string>> = {
  light: '清淡',
  spicy: '香辣',
  savory: '咸鲜',
  sweet: '甜口',
  sour: '酸口',
  'sweet-sour': '糖醋',
  salty: '咸香',
};

export default function RecipeListScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { state, startGeneration } = useP0Store();
  const recipes = useMemo(
    () => state.generation.recipeIds.map((recipeId) => state.recipeCache[recipeId]).filter((recipe) => recipe !== undefined),
    [state.generation.recipeIds, state.recipeCache],
  );

  const regenerate = () => {
    const excludedRecipes = recipes.map((recipe) => ({ title: recipe.title, cookingMethod: recipe.cookingMethod }));
    startGeneration('zh-CN', excludedRecipes);
    router.replace('/generating' as Href);
  };

  return <Screen>
    <AppHeader title={t('recipeList.title')} back />
    <ThemedText themeColor="textSecondary">{t('recipeList.subtitle')}</ThemedText>
    {recipes.length === 0
      ? <AppCard><ThemedText>{t('recipeList.empty')}</ThemedText><AppButton label={t('common.home')} onPress={() => router.replace('/' as Href)} /></AppCard>
      :         <FlatList
        data={recipes}
        keyExtractor={(recipe) => recipe.recipeId}
        contentContainerStyle={styles.list}
        removeClippedSubviews
        windowSize={5}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={80}
        renderItem={({ item: recipe }) => (
          <Pressable onPress={() => router.push(`/recipe/${recipe.recipeId}` as Href)}>
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.methodBadge}>
                  <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>{METHOD_LABEL[recipe.cookingMethod] ?? t('recipeList.method')}</ThemedText>
                </LinearGradient>
                <ThemedText type="small" themeColor="textSecondary">{CUISINE_LABEL[recipe.cuisine] ?? ''} · {t('common.minutes', { count: recipe.totalTimeMinutes })}</ThemedText>
                <View style={styles.spacer} />
                <View style={[styles.arrowCircle, { backgroundColor: theme.surfaceTint }]}><ThemedText style={{ color: theme.primary }}>›</ThemedText></View>
              </View>
              <ThemedText type="title" style={styles.title}>{recipe.title}</ThemedText>
              <ThemedText themeColor="textSecondary" numberOfLines={2}>{recipe.description}</ThemedText>
              <View style={styles.metaRow}>
                <View style={[styles.metaChip, { backgroundColor: theme.surfaceTint }]}><ThemedText type="small" style={{ color: theme.textSecondary }}>{FLAVOR_LABEL[recipe.flavor] ?? recipe.flavor}</ThemedText></View>
                <View style={[styles.metaChip, { backgroundColor: theme.surfaceTint }]}><ThemedText type="small" style={{ color: theme.textSecondary }}>{t('recipeList.difficulty', { value: t(`recipe.${recipe.difficulty}`) })}</ThemedText></View>
              </View>
            </AppCard>
          </Pressable>
        )}
      />}
    {recipes.length > 0 && <AppButton label={t('recipeList.regenerate')} variant="secondary" onPress={regenerate} />}
  </Screen>;
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm, paddingBottom: Spacing.lg },
  card: { gap: Spacing.xs, paddingVertical: Spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  methodBadge: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  spacer: { flex: 1 },
  arrowCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 26 },
  metaRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  metaChip: { borderRadius: Radius.chip, paddingHorizontal: 10, paddingVertical: 4 },
});
