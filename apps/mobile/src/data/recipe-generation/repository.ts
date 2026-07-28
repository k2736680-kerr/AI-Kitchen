import type { GenerationApiRequest, GenerationApiResponse } from '@ai-kitchen/shared';

export interface RecipeGenerationRepository {
  generate(request: GenerationApiRequest, signal: AbortSignal): Promise<GenerationApiResponse>;
}
