import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import type { P0State } from '@/state/p0-state';

export function GenerationDraftSummary({ state }: { readonly state: P0State }) {
  const { t } = useTranslation();
  const cookware = state.generationDraft.availableTools.length > 0
    ? state.generationDraft.availableTools.map((item) => t(`cookware.${item}`)).join(' · ')
    : t('generation.none');
  const preferences = state.generationDraft.dietaryPreferences.map((item) => t(`preferences.${item}`)).join(' · ') || t('common.notSet');
  const allergens = state.generationDraft.allergens.map((item) => t(`allergens.${item}`)).join(' · ') || t('common.notSet');
  const excluded = state.generationDraft.excludedIngredients.length || 0;
  return <View style={{ gap: 4 }}><ThemedText>{t('generation.ingredientCount', { count: state.selectedIngredients.length })} · {t('common.people', { count: state.generationDraft.servings })} · {t('common.minutes', { count: state.generationDraft.maxCookingTimeMinutes })}</ThemedText><ThemedText type="small" themeColor="textSecondary">{cookware}</ThemedText><ThemedText type="small" themeColor="textSecondary">{preferences} · {allergens} · {t('common.steps', { count: excluded })}</ThemedText></View>;
}
