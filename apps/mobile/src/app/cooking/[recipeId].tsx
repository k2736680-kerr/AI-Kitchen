import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/app-button';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { fixtureRecipeRepository } from '@/data/fixtures/recipe-repository';
import { environmentConfig } from '@/config/environment';
import { CookingBoundaryNotice } from '@/features/cooking/cooking-boundary-notice';
import { CookingCompleteState } from '@/features/cooking/cooking-complete-state';
import { CookingControls } from '@/features/cooking/cooking-controls';
import { CookingHeader } from '@/features/cooking/cooking-header';
import { CookingProgress } from '@/features/cooking/cooking-progress';
import { CookingStepCard } from '@/features/cooking/cooking-step-card';
import { CookingStepList } from '@/features/cooking/cooking-step-list';
import { useP0Store } from '@/state/p0-store';
import { selectCookingProgress, selectCookingSession } from '@/state/p0-selectors';

export default function CookingScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ recipeId?: string | string[] }>();
  const recipeId = Array.isArray(params.recipeId) ? params.recipeId[0] : params.recipeId;
  const { state, initializeCookingSession, setCookingStep, completeCookingStep, resetCookingSession } = useP0Store();
  const recipe = recipeId ? state.recipeCache[recipeId] ?? (environmentConfig.generationMode === 'local' ? fixtureRecipeRepository.getById(recipeId) : undefined) : undefined;
  const session = recipeId ? selectCookingSession(state, recipeId) : undefined;

  useEffect(() => {
    if (recipe && recipe.steps.length > 0 && !session) initializeCookingSession(recipe.recipeId, recipe.steps.length);
  }, [recipe, session, initializeCookingSession]);

  if (!recipe) return <Screen><AppHeader title={t('recipe.notFound')} back /><StatusMessage message={t('recipe.notFoundHint')} tone="error" /><AppButton label={t('cooking.recipeDetail')} onPress={() => router.back()} /><AppButton label={t('common.home')} variant="secondary" onPress={() => router.replace('/' as Href)} /></Screen>;
  if (!recipe.steps.length) return <Screen><AppHeader title={t('cooking.eyebrow')} back /><StatusMessage message={t('cooking.noSteps')} tone="error" /><AppButton label={t('cooking.recipeDetail')} onPress={() => router.replace(`/recipe/${recipe.recipeId}` as Href)} /></Screen>;
  if (!session) return <Screen><AppHeader title={t('cooking.preparing')} back /><StatusMessage message={t('common.loading')} /></Screen>;

  const orderedSteps = [...recipe.steps].sort((a, b) => a.order - b.order);
  const currentStep = orderedSteps[session.currentStepIndex];
  const progress = selectCookingProgress(state, recipe.recipeId);
  if (session.status === 'completed') return <Screen><AppHeader title={t('cooking.eyebrow')} back /><CookingCompleteState title={recipe.title} completed={progress.completed} total={progress.total} onDetail={() => router.replace(`/recipe/${recipe.recipeId}` as Href)} onRestart={() => resetCookingSession(recipe.recipeId)} onHome={() => router.replace('/' as Href)} /></Screen>;
  return <Screen><AppHeader title={t('cooking.eyebrow')} back /><CookingHeader title={recipe.title} current={session.currentStepIndex} total={session.totalSteps} completed={progress.completed} status={session.status} /><CookingProgress {...progress} />{currentStep ? <CookingStepCard step={currentStep} /> : <StatusMessage message={t('cooking.unavailable')} tone="error" />}<CookingStepList steps={orderedSteps} currentStepIndex={session.currentStepIndex} completedStepIndexes={session.completedStepIndexes} /><CookingControls current={session.currentStepIndex} total={session.totalSteps} completeDisabled={session.completedStepIndexes.includes(session.currentStepIndex)} onPrevious={() => setCookingStep(recipe.recipeId, session.currentStepIndex - 1)} onNext={() => setCookingStep(recipe.recipeId, session.currentStepIndex + 1)} onComplete={() => completeCookingStep(recipe.recipeId, session.currentStepIndex)} onExit={() => router.replace(`/recipe/${recipe.recipeId}` as Href)} /><CookingBoundaryNotice /></Screen>;
}
