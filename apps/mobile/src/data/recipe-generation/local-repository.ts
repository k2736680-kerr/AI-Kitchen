import { GenerationApiResponseSchema, type GenerationApiRequest, type GenerationApiResponse } from '@ai-kitchen/shared';

import { generateLocalRecipe } from '../fixtures/generation-service';
import { fixtureRecipeRepository } from '../fixtures/recipe-repository';
import type { RecipeGenerationRepository } from './repository';

export class LocalRecipeGenerationRepository implements RecipeGenerationRepository {
  public async generate(request: GenerationApiRequest, signal: AbortSignal): Promise<GenerationApiResponse> {
    const startedAt = Date.now();
    if (request.generationRequest.locale === 'en-US') {
      return GenerationApiResponseSchema.parse({
        status: 'service_unavailable',
        schemaVersion: 'v1',
        requestId: request.requestId,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'English local recipe generation is unavailable. Use remote generation.' },
      });
    }
    const result = await generateLocalRecipe({ request: request.generationRequest, signal });
    if (result.status === 'no-match') {
      return GenerationApiResponseSchema.parse({ status: 'no_match', schemaVersion: 'v1', requestId: request.requestId, message: result.message });
    }

    const recipe = fixtureRecipeRepository.getById(result.recipeId);
    if (!recipe) {
      return GenerationApiResponseSchema.parse({
        status: 'generation_failed',
        schemaVersion: 'v1',
        requestId: request.requestId,
        error: { code: 'GENERATION_FAILED', message: '菜谱生成失败，请稍后重试。' },
      });
    }
    return GenerationApiResponseSchema.parse({
      status: 'success',
      schemaVersion: 'v1',
      requestId: request.requestId,
      recipe,
      metadata: {
        source: 'local',
        provider: 'deterministic',
        generatedAt: new Date().toISOString(),
        durationMs: Math.max(0, Date.now() - startedAt),
        repaired: false,
        requestVersion: request.generationRequest.schemaVersion,
        recipeSchemaVersion: 'recipe.v1.0.0',
      },
    });
  }
}
