import { useCallback, useRef } from 'react';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { DIETARY_PREFERENCE_OPTIONS, ALLERGEN_OPTIONS, type AllergenCode, type DietaryPreference } from '@ai-kitchen/shared';
import { fixtureIngredientRepository } from '@/data/fixtures/ingredient-repository';
import { presentCatalogIngredient, presentSelectedIngredient, resolveIngredientLocale } from '@/features/ingredients/ingredient-presentation';
import { CookwareSelector } from '@/features/generation/cookware-selector';
import { GenerationDraftSummary } from '@/features/generation/generation-draft-summary';
import { MultiOptionSelector } from '@/features/generation/multi-option-selector';
import { ServingSelector } from '@/features/generation/serving-selector';
import { TimeSelector } from '@/features/generation/time-selector';
import { selectGenerationValidation } from '@/state/p0-selectors';
import { useP0Store } from '@/state/p0-store';

export default function GenerateScreen() {
  const { t, i18n } = useTranslation();
  const ingredientLocale = resolveIngredientLocale(i18n.language);
  const {
    state,
    setServings,
    setMaxTime,
    toggleCookware,
    toggleDietaryPreference,
    toggleAllergen,
    toggleExcludedIngredient,
    clearDietaryPreferences,
    clearAllergens,
    clearExcludedIngredients,
    startGeneration,
  } = useP0Store();
  const submitLock = useRef(false);
  const validation = selectGenerationValidation(state);
  const hasIngredients = state.selectedIngredients.length > 0;
  const submitDisabled = state.generation.status === 'generating';

  useFocusEffect(useCallback(() => {
    submitLock.current = false;
  }, []));

  const submit = () => {
    if (!validation.canSubmit || submitLock.current || submitDisabled) return;
    submitLock.current = true;
    startGeneration(ingredientLocale);
    router.push('/generating' as Href);
  };

  return <Screen>
    <AppHeader title={t('generation.title')} eyebrow={t('generation.eyebrow')} back />
    <AppCard>
      <ThemedText type="sectionTitle">{t('generation.selectedIngredients', { count: state.selectedIngredients.length })}</ThemedText>
      <ThemedText>{hasIngredients ? state.selectedIngredients.map((item) => presentSelectedIngredient(item, ingredientLocale)).join(' · ') : t('generation.noIngredients')}</ThemedText>
      {!hasIngredients && <StatusMessage message={t('generation.chooseIngredients')} tone="error" />}
    </AppCard>
    <AppCard>
      <ThemedText type="sectionTitle">{t('generation.servings')}</ThemedText>
      <ServingSelector value={state.generationDraft.servings} onChange={setServings} />
      <ThemedText type="sectionTitle">{t('generation.maxTime')}</ThemedText>
      <TimeSelector value={state.generationDraft.maxCookingTimeMinutes} onChange={setMaxTime} />
      <ThemedText type="sectionTitle">{t('generation.cookware')} · {t('common.optional')}</ThemedText>
      <CookwareSelector selected={state.generationDraft.availableTools} onToggle={toggleCookware} />
    </AppCard>
    <AppCard>
      <ThemedText type="sectionTitle">{t('generation.dietary')} · {t('common.optional')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{t('generation.dietaryHint')}</ThemedText>
      <MultiOptionSelector<DietaryPreference>
        options={DIETARY_PREFERENCE_OPTIONS.map((value) => ({ value: value as DietaryPreference, label: t(`preferences.${value}`) }))}
        selected={state.generationDraft.dietaryPreferences}
        onToggle={toggleDietaryPreference}
      />
      {state.generationDraft.dietaryPreferences.length > 0 && <AppButton label={t('generation.clearDietary')} variant="ghost" onPress={clearDietaryPreferences} />}
    </AppCard>
    <AppCard>
      <ThemedText type="sectionTitle">{t('generation.allergens')} · {t('common.optional')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{t('generation.allergensHint')}</ThemedText>
      <MultiOptionSelector<AllergenCode>
        options={ALLERGEN_OPTIONS.map((value) => ({ value: value as AllergenCode, label: t(`allergens.${value}`) }))}
        selected={state.generationDraft.allergens}
        onToggle={toggleAllergen}
      />
      {state.generationDraft.allergens.length > 0 && <AppButton label={t('generation.clearAllergens')} variant="ghost" onPress={clearAllergens} />}
    </AppCard>
    <AppCard>
      <ThemedText type="sectionTitle">{t('generation.exclusions')} · {t('common.optional')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{t('generation.exclusionsHint')}</ThemedText>
      <MultiOptionSelector
        options={fixtureIngredientRepository.listAll().map((ingredient) => ({ value: ingredient.id, label: presentCatalogIngredient(ingredient, ingredientLocale).name }))}
        selected={state.generationDraft.excludedIngredients}
        onToggle={toggleExcludedIngredient}
      />
      {state.generationDraft.excludedIngredients.length > 0 && <AppButton label={t('generation.clearExclusions')} variant="ghost" onPress={clearExcludedIngredients} />}
    </AppCard>
    <AppCard>
      <ThemedText type="sectionTitle">{t('generation.summary')}</ThemedText>
      <GenerationDraftSummary state={state} />
      <StatusMessage message={t('generation.summaryHint')} />
      {validation.messages.map((message) => <StatusMessage key={message} message={message} tone="error" />)}
    </AppCard>
    <AppButton label={t('generation.backToIngredients')} variant="secondary" onPress={() => router.back()} />
    <AppButton label={t('generation.generate')} disabled={!validation.canSubmit || submitDisabled} onPress={submit} />
  </Screen>;
}
