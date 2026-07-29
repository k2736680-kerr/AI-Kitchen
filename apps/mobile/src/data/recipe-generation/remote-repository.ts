import type { GenerationApiRequest, GenerationApiResponse } from '@ai-kitchen/shared';

import { GenerationApiClient } from '../api/generation-client';
import { guestSessionService } from '@/auth/guest-session';
import type { RecipeGenerationRepository } from './repository';

export class RemoteRecipeGenerationRepository implements RecipeGenerationRepository {
  private readonly client: GenerationApiClient;

  public constructor(baseUrl: string) {
    this.client = new GenerationApiClient(baseUrl, () => guestSessionService.readToken());
  }

  public generate(request: GenerationApiRequest, signal: AbortSignal): Promise<GenerationApiResponse> {
    return this.client.generate(request, signal);
  }
}
