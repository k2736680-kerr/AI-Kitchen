import type { HistoryListResponse, HistoryVisitRequest, Recipe } from '@ai-kitchen/shared';

import { GenerationApiClient } from '../api/generation-client';

/** Remote read/write boundary for persisted recipes and guest history. */
export class RemoteRecipeDataRepository {
  private readonly client: GenerationApiClient;

  public constructor(baseUrl: string) {
    this.client = new GenerationApiClient(baseUrl);
  }

  public getRecipe(recipeId: string, signal: AbortSignal): Promise<Recipe> {
    return this.client.getRecipe(recipeId, signal);
  }

  public listHistory(guestId: string, signal: AbortSignal): Promise<HistoryListResponse> {
    return this.client.listHistory(guestId, signal);
  }

  public recordVisit(visit: HistoryVisitRequest, signal: AbortSignal): Promise<void> {
    return this.client.recordHistoryVisit(visit, signal);
  }
}
