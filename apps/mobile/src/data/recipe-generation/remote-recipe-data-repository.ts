import type { HistoryListResponse, Recipe, SupportedLocale } from '@ai-kitchen/shared';

import { guestSessionService } from '@/auth/guest-session';
import { GenerationApiClient } from '../api/generation-client';

/** Remote read/write boundary for persisted recipes and guest history. */
export class RemoteRecipeDataRepository {
  private readonly client: GenerationApiClient;

  public constructor(baseUrl: string) {
    this.client = new GenerationApiClient(baseUrl, () => guestSessionService.readToken());
  }

  public getRecipe(recipeId: string, signal: AbortSignal): Promise<Recipe> {
    return this.client.getRecipe(recipeId, signal);
  }

  public listHistory(locale: SupportedLocale, signal: AbortSignal): Promise<HistoryListResponse> {
    return this.client.listHistory(locale, signal);
  }

  public recordVisit(visit: { readonly recipeId: string; readonly source: 'local' | 'remote' }, signal: AbortSignal): Promise<void> {
    return this.client.recordHistoryVisit(visit, signal);
  }
}
