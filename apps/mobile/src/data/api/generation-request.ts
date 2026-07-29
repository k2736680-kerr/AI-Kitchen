import {
  GENERATION_API_SCHEMA_VERSION,
  GenerationApiRequestSchema,
  type GenerationApiRequest,
  type GenerationRequest,
} from '@ai-kitchen/shared';

export interface GenerationApiRequestSource {
  readonly requestSnapshot: GenerationRequest | null;
  readonly requestId: string | null;
  readonly idempotencyKey: string | null;
}

export function createGenerationApiRequest(state: GenerationApiRequestSource, clientVersion: string): GenerationApiRequest | null {
  const request = state.requestSnapshot;
  const requestId = state.requestId;
  const idempotencyKey = state.idempotencyKey;
  if (!request || !requestId || !idempotencyKey) return null;

  return GenerationApiRequestSchema.parse({
    schemaVersion: GENERATION_API_SCHEMA_VERSION,
    requestId,
    idempotencyKey,
    clientVersion,
    identity: { type: 'guest' },
    generationRequest: request,
  });
}
