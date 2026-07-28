import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useP0Store } from '@/state/p0-store';
import { generateFixtureRecipe } from '@/data/fixtures/generation-service';
import { GeneratingState } from '@/features/generation/generating-state';
import { GenerationErrorState } from '@/features/generation/generation-error-state';
import type { ApiError } from '@ai-kitchen/shared';

export default function GeneratingScreen() {
  const { state, setLastRecipe, addRecentRecipe } = useP0Store();
  const params = useLocalSearchParams<{ scenario?: string }>();
  const scenario = params.scenario === 'fail-once' ? 'fail-once' : 'success';
  const [attempt, setAttempt] = useState(1);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let active = true;
    void generateFixtureRecipe({ draft: state.generationDraft, scenario, attempt }).then((result) => {
      if (!active) return;
      setLastRecipe(result.recipeId);
      addRecentRecipe({ recipeId: result.recipeId, viewedAt: new Date().toISOString(), source: 'fixture' });
      router.replace(`/recipe/${result.recipeId}` as Href);
    }).catch((reason: unknown) => {
      if (active && typeof reason === 'object' && reason !== null && 'code' in reason && 'message' in reason) setError(reason as ApiError);
    });
    return () => { active = false; };
  }, [addRecentRecipe, attempt, scenario, setLastRecipe, state.generationDraft]);

  const cancel = () => Alert.alert('取消生成', '确定取消本次固定生成演示吗？', [{ text: '继续等待', style: 'cancel' }, { text: '取消生成', style: 'destructive', onPress: () => router.back() }]);
  return <Screen><ThemedText type="title">固定生成</ThemedText>{error ? <GenerationErrorState error={error} onRetry={() => { setError(null); setAttempt((value) => value + 1); }} onBack={() => router.back()} /> : <GeneratingState state={state} attempt={attempt} onCancel={cancel} />}</Screen>;
}
