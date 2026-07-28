import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppButton } from '@/components/app-button';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { fixtureRecipeRepository } from '@/data/fixtures/recipe-repository';
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
  const params = useLocalSearchParams<{ recipeId?: string | string[] }>();
  const recipeId = Array.isArray(params.recipeId) ? params.recipeId[0] : params.recipeId;
  const { state, initializeCookingSession, setCookingStep, completeCookingStep, resetCookingSession } = useP0Store();
  const recipe = recipeId ? fixtureRecipeRepository.getById(recipeId) : undefined;
  const session = recipeId ? selectCookingSession(state, recipeId) : undefined;

  useEffect(() => {
    if (recipe && recipe.steps.length > 0 && !session) initializeCookingSession(recipe.recipeId, recipe.steps.length);
  }, [recipe, session, initializeCookingSession]);

  if (!recipe) return <Screen><ThemedText type="title">未找到固定菜谱</ThemedText><StatusMessage message="NOT_FOUND：找不到请求的固定菜谱。" tone="error" /><AppButton label="返回菜谱详情" onPress={() => router.back()} /><AppButton label="返回首页" variant="secondary" onPress={() => router.replace('/' as Href)} /></Screen>;
  if (!recipe.steps.length) return <Screen><StatusMessage message="当前菜谱没有可用步骤。" tone="error" /><AppButton label="返回菜谱详情" onPress={() => router.replace(`/recipe/${recipe.recipeId}` as Href)} /></Screen>;
  if (!session) return <Screen><ThemedText type="title">正在准备烹饪步骤</ThemedText><StatusMessage message="正在准备烹饪步骤" /></Screen>;

  const orderedSteps = [...recipe.steps].sort((a, b) => a.order - b.order);
  const currentStep = orderedSteps[session.currentStepIndex];
  const progress = selectCookingProgress(state, recipe.recipeId);
  if (session.status === 'completed') return <Screen><CookingCompleteState title={recipe.title} completed={progress.completed} total={progress.total} onDetail={() => router.replace(`/recipe/${recipe.recipeId}` as Href)} onRestart={() => resetCookingSession(recipe.recipeId)} onHome={() => router.replace('/' as Href)} /></Screen>;
  return <Screen><CookingHeader title={recipe.title} current={session.currentStepIndex} total={session.totalSteps} completed={progress.completed} status={session.status} /><CookingProgress {...progress} />{currentStep ? <CookingStepCard step={currentStep} /> : <StatusMessage message="当前步骤不可用，请返回菜谱详情。" tone="error" />}<CookingStepList steps={orderedSteps} currentStepIndex={session.currentStepIndex} completedStepIndexes={session.completedStepIndexes} /><CookingControls current={session.currentStepIndex} total={session.totalSteps} completeDisabled={session.completedStepIndexes.includes(session.currentStepIndex)} onPrevious={() => setCookingStep(recipe.recipeId, session.currentStepIndex - 1)} onNext={() => setCookingStep(recipe.recipeId, session.currentStepIndex + 1)} onComplete={() => completeCookingStep(recipe.recipeId, session.currentStepIndex)} onExit={() => router.replace(`/recipe/${recipe.recipeId}` as Href)} /><CookingBoundaryNotice /></Screen>;
}
