import { environmentConfig } from '@/config/environment';

import { LocalRecipeGenerationRepository } from './local-repository';
import { RemoteRecipeGenerationRepository } from './remote-repository';
import type { RecipeGenerationRepository } from './repository';

export function createRecipeGenerationRepository(): RecipeGenerationRepository {
  if (environmentConfig.generationMode === 'local') return new LocalRecipeGenerationRepository();
  return new RemoteRecipeGenerationRepository(environmentConfig.apiBaseUrl);
}
