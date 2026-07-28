import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router, type Href } from 'expo-router';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { generateLocalRecipe } from '@/data/fixtures/generation-service';
import { GenerationErrorState } from '@/features/generation/generation-error-state';
import { GeneratingState } from '@/features/generation/generating-state';
import { useP0Store } from '@/state/p0-store';
import type { ApiError } from '@ai-kitchen/shared';

function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value;
}

export default function GeneratingScreen() {
  const {
    state,
    startGeneration,
    setLastRecipe,
    setGenerationSucceeded,
    setGenerationNoMatch,
    setGenerationFailed,
    addRecentRecipe,
    cancelGeneration,
  } = useP0Store();
  const [attempt, setAttempt] = useState(1);

  useEffect(() => {
    const request = state.generation.requestSnapshot;
    if (!request) {
      router.replace('/generate' as Href);
      return;
    }
    let active = true;

    void generateLocalRecipe({ request }).then((result) => {
      if (!active) return;
      if (result.status === 'no-match') {
        setGenerationNoMatch();
        router.replace('/generation-result' as Href);
        return;
      }

      setLastRecipe(result.recipeId);
      setGenerationSucceeded(result.recipeId);
      addRecentRecipe({ recipeId: result.recipeId, viewedAt: new Date().toISOString(), source: 'fixture' });
      router.replace(`/recipe/${result.recipeId}` as Href);
    }).catch((reason: unknown) => {
      if (active) setGenerationFailed(isApiError(reason) ? reason : { code: 'INTERNAL_ERROR', message: '菜谱生成暂时不可用，请稍后重试。' });
    });

    return () => {
      active = false;
    };
  }, [addRecentRecipe, attempt, setGenerationFailed, setGenerationNoMatch, setGenerationSucceeded, setLastRecipe, startGeneration, state.generation.requestSnapshot]);

  const cancel = () => Alert.alert('取消生成', '确定取消当前生成吗？', [
    { text: '继续等待', style: 'cancel' },
    { text: '取消生成', style: 'destructive', onPress: () => { cancelGeneration(); router.back(); } },
  ]);

  return <Screen>
    <ThemedText type="title">正在生成菜谱</ThemedText>
    {state.generation.status === 'failed' && state.generation.error ? <GenerationErrorState error={state.generation.error} onRetry={() => { startGeneration(`local-generation:${Date.now().toString(36)}:retry`); setAttempt((value) => value + 1); }} onBack={() => router.replace('/generate' as Href)} /> : <GeneratingState state={state} onCancel={cancel} />}
  </Screen>;
}
