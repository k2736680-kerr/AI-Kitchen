import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { router, type Href } from 'expo-router';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { GenerationClientError } from '@/data/api/generation-client';
import { createGenerationApiRequest } from '@/data/api/generation-request';
import { createRecipeGenerationRepository } from '@/data/recipe-generation/repository-factory';
import type { GenerationApiResponse } from '@ai-kitchen/shared';
import { environmentConfig } from '@/config/environment';
import { GenerationErrorState } from '@/features/generation/generation-error-state';
import { GeneratingState } from '@/features/generation/generating-state';
import { useP0Store } from '@/state/p0-store';
function toUserError(response: Exclude<GenerationApiResponse, { status: 'success' | 'no_match' }>) {
  if (response.status === 'validation_error') return { code: 'INVALID_REQUEST' as const, message: response.error.message };
  if (response.status === 'rate_limited') return { code: 'RATE_LIMITED' as const, message: response.error.message };
  if (response.status === 'timeout') return { code: 'TIMEOUT' as const, message: response.error.message };
  if (response.status === 'service_unavailable') return { code: 'SERVICE_UNAVAILABLE' as const, message: response.error.message };
  return { code: 'GENERATION_FAILED' as const, message: response.error.message };
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
  const repository = useMemo(() => createRecipeGenerationRepository(), []);
  const guestId = state.guestId;
  const requestId = state.generation.requestId;
  const idempotencyKey = state.generation.idempotencyKey;
  const requestSnapshot = state.generation.requestSnapshot;

  useEffect(() => {
    const request = createGenerationApiRequest({ guestId, requestId, idempotencyKey, requestSnapshot }, environmentConfig.clientVersion);
    if (!request) {
      router.replace('/generate' as Href);
      return;
    }
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), environmentConfig.apiTimeoutMs);

    void repository.generate(request, controller.signal).then((result) => {
      if (!active) return;
      if (result.status === 'success') {
        setLastRecipe(result.recipe.recipeId);
        setGenerationSucceeded(result.recipe, result.metadata.source);
        addRecentRecipe({ recipeId: result.recipe.recipeId, viewedAt: new Date().toISOString(), source: result.metadata.source === 'provider' ? 'remote' : 'local' });
        router.replace(`/recipe/${result.recipe.recipeId}` as Href);
      } else if (result.status === 'no_match') {
        setGenerationNoMatch(result.message);
        router.replace('/generation-result' as Href);
      } else {
        setGenerationFailed(toUserError(result));
      }
    }).catch((reason: unknown) => {
      if (!active) return;
      if (reason instanceof GenerationClientError) {
        setGenerationFailed({ code: reason.kind === 'timeout' ? 'TIMEOUT' : reason.kind === 'configuration' ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR', message: reason.message });
      } else if (reason instanceof DOMException && reason.name === 'AbortError') {
        setGenerationFailed({ code: 'TIMEOUT', message: '生成请求超时，请稍后重试。' });
      } else {
        setGenerationFailed({ code: 'INTERNAL_ERROR', message: '菜谱生成暂时不可用，请稍后重试。' });
      }
    });

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [addRecentRecipe, attempt, guestId, idempotencyKey, repository, requestId, requestSnapshot, setGenerationFailed, setGenerationNoMatch, setGenerationSucceeded, setLastRecipe]);

  const cancel = () => Alert.alert('取消生成', '确定取消当前生成吗？', [
    { text: '继续等待', style: 'cancel' },
    { text: '取消生成', style: 'destructive', onPress: () => { cancelGeneration(); router.back(); } },
  ]);

  return <Screen>
    <ThemedText type="title">正在生成菜谱</ThemedText>
    {state.generation.status === 'failed' && state.generation.error ? <GenerationErrorState error={state.generation.error} onRetry={() => { startGeneration(); setAttempt((value) => value + 1); }} onBack={() => router.replace('/generate' as Href)} /> : <GeneratingState state={state} onCancel={cancel} />}
  </Screen>;
}
