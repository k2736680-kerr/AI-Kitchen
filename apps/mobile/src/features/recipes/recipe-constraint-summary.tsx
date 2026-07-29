import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { RecipeFixture } from '@ai-kitchen/shared';

import { AppCard } from '@/components/app-card';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';

export function RecipeConstraintSummary({ recipe }: { readonly recipe: RecipeFixture }) {
  const { t } = useTranslation();
  const tags = recipe.dietaryTags.map((tag) => t(`preferences.${tag}`)).join(' · ');
  const allergens = recipe.allergenCodes.map((allergen) => t(`allergens.${allergen}`)).join(' · ');
  return <AppCard>
    <ThemedText type="sectionTitle" style={styles.heading}>{t('recipe.dietarySafety')}</ThemedText>
    <ThemedText type="small" themeColor="textSecondary">{t('recipe.dietaryTags', { items: tags || t('recipe.noTags') })}</ThemedText>
    {allergens ? <StatusMessage message={t('recipe.allergenPresent', { items: allergens })} tone="warning" /> : <StatusMessage message={t('recipe.allergenUnknown')} />}
  </AppCard>;
}

const styles = StyleSheet.create({ heading: { fontSize: 20, lineHeight: 28 } });
