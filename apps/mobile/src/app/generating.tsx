import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { GenerationClientError } from '@/data/api/generation-client';
import { createGenerationApiRequest } from '@/data/api/generation-request';
import { createRecipeGenerationRepository } from '@/data/recipe-generation/repository-factory';
import { RemoteRecipeDataRepository } from '@/data/recipe-generation/remote-recipe-data-repository';
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
  if (response.status === 'idempotency_conflict') return { code: response.error.code, message: response.error.message };
  return { code: 'GENERATION_FAILED' as const, message: response.error.message };
}

export default function GeneratingScreen() {
  const { t, i18n } = useTranslation();
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
  const remoteData = useMemo(() => environmentConfig.generationMode === 'remote' ? new RemoteRecipeDataRepository(environmentConfig.apiBaseUrl) : null, []);
  const requestId = state.generation.requestId;
  const idempotencyKey = state.generation.idempotencyKey;
  const requestSnapshot = state.generation.requestSnapshot;

  useEffect(() => {
    if (environmentConfig.generationMode === 'remote' && state.identityStatus !== 'ready') return;
    const request = createGenerationApiRequest({ requestId, idempotencyKey, requestSnapshot }, environmentConfig.clientVersion);
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
        addRecentRecipe({ recipeId: result.recipe.recipeId, viewedAt: new Date().toISOString(), source: result.metadata.source === 'provider' ? 'remote' : 'local', locale: result.recipe.locale });
        if (remoteData) void remoteData.recordVisit({ recipeId: result.recipe.recipeId, source: 'remote' }, new AbortController().signal).catch(() => undefined);
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
        setGenerationFailed({ code: reason.kind === 'timeout' ? 'TIMEOUT' : reason.kind === 'configuration' || reason.kind === 'auth-required' ? 'AUTH_REQUIRED' : 'INTERNAL_ERROR', message: reason.message });
      } else if (reason instanceof DOMException && reason.name === 'AbortError') {
        setGenerationFailed({ code: 'TIMEOUT', message: t('generation.timedOut') });
      } else {
        setGenerationFailed({ code: 'INTERNAL_ERROR', message: t('generation.unavailable') });
      }
    });

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [addRecentRecipe, attempt, idempotencyKey, remoteData, repository, requestId, requestSnapshot, setGenerationFailed, setGenerationNoMatch, setGenerationSucceeded, setLastRecipe, state.identityStatus, t]);

  const cancel = () => Alert.alert(t('generation.cancelTitle'), t('generation.cancelConfirm'), [
    { text: t('generation.continueWaiting'), style: 'cancel' },
    { text: t('generation.cancel'), style: 'destructive', onPress: () => { cancelGeneration(); router.back(); } },
  ]);

  return <Screen>
    <AppHeader title={t('generation.generatingTitle')} back />
    {state.generation.status === 'failed' && state.generation.error ? <GenerationErrorState error={state.generation.error} onRetry={() => { startGeneration(i18n.language === 'en-US' ? 'en-US' : 'zh-CN'); setAttempt((value) => value + 1); }} onBack={() => router.replace('/generate' as Href)} /> : <GeneratingState state={state} onCancel={cancel} />}
  </Screen>;
}
