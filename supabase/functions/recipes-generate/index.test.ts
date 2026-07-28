import { describe, expect, it } from 'vitest';

import {
  createRecipesGenerateHandler,
  DeterministicProvider,
  MemoryIdempotencyStore,
  RateLimiter,
  type RecipeProvider,
  type HandlerDependencies,
} from './index';

const basePayload = {
  schemaVersion: 'v1',
  requestId: 'req_edge_test_1234',
  idempotencyKey: 'idem_edge_test_1234',
  clientVersion: '1.0.0',
  identity: { type: 'guest', guestId: 'guest-edge-test' },
  generationRequest: {
    schemaVersion: 'v1',
    selectedIngredientIds: ['egg', 'tomato', 'noodles'],
    customIngredients: [],
    servings: 2,
    maxCookingTimeMinutes: 30,
    availableTools: [],
    dietaryPreferences: [],
    allergens: [],
    excludedIngredients: [],
  },
};

function createDependencies(): HandlerDependencies {
  return {
    config: {
      environment: 'development',
      provider: 'deterministic',
      providerTimeoutMs: 30_000,
      maxBodyBytes: 64 * 1024,
      rateLimitPerMinute: 10,
      useMemoryIdempotency: true,
    },
    idempotency: new MemoryIdempotencyStore(),
    provider: new DeterministicProvider(),
    now: () => new Date('2026-07-28T00:00:00.000Z'),
    log: () => undefined,
    rateLimiter: new RateLimiter(),
  };
}

function createRequest(payload: unknown): Request {
  const body = payload as typeof basePayload;
  return new Request('http://localhost/functions/v1/recipes-generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': typeof body.requestId === 'string' ? body.requestId : basePayload.requestId,
      'x-idempotency-key': typeof body.idempotencyKey === 'string' ? body.idempotencyKey : basePayload.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}

describe('recipes-generate Edge Function', () => {
  it('handles CORS preflight and malformed requests without a stack trace', async () => {
    const handler = createRecipesGenerateHandler(createDependencies());
    const options = await handler(new Request('http://localhost/functions/v1/recipes-generate', { method: 'OPTIONS' }));
    expect(options.status).toBe(204);
    const malformed = await handler(new Request('http://localhost/functions/v1/recipes-generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }));
    expect(malformed.status).toBe(400);
    expect(await malformed.text()).not.toContain('stack');

    const unsupported = { ...basePayload, schemaVersion: 'v2' };
    const versionResponse = await handler(createRequest(unsupported));
    expect(versionResponse.status).toBe(400);
    expect((await versionResponse.json()).error.code).toBe('SCHEMA_VERSION_UNSUPPORTED');
  });

  it('returns a validated success response', async () => {
    const handler = createRecipesGenerateHandler(createDependencies());
    const response = await handler(createRequest(basePayload));
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe('success');
  });

  it('replays the same idempotency key and rejects a different payload', async () => {
    const handler = createRecipesGenerateHandler(createDependencies());
    const first = await handler(createRequest(basePayload));
    const second = await handler(createRequest(basePayload));
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(await first.json());

    const conflictPayload = { ...basePayload, requestId: 'req_edge_conflict_1234', generationRequest: { ...basePayload.generationRequest, servings: 4 } };
    const conflict = await handler(createRequest(conflictPayload));
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('blocks an allergen conflict before provider execution', async () => {
    const handler = createRecipesGenerateHandler(createDependencies());
    const response = await handler(createRequest({ ...basePayload, idempotencyKey: 'idem_allergen_test_1234', generationRequest: { ...basePayload.generationRequest, allergens: ['egg.chicken'] } }));
    expect(response.status).toBe(422);
    expect((await response.json()).status).toBe('validation_error');
  });

  it('allows at most one repair call and rejects an unsafe repaired result', async () => {
    let repairCalls = 0;
    const provider: RecipeProvider = {
      name: 'http',
      generate: async () => ({ invalid: true }),
      repair: async () => {
        repairCalls += 1;
        return { invalid: true };
      },
    };
    const dependencies = createDependencies();
    const handler = createRecipesGenerateHandler({ ...dependencies, provider });
    const response = await handler(createRequest({ ...basePayload, idempotencyKey: 'idem_repair_test_1234' }));
    expect(response.status).toBe(500);
    expect(repairCalls).toBe(1);
  });

  it('returns a timeout when the provider does not finish before the deadline', async () => {
    const dependencies = createDependencies();
    const provider: RecipeProvider = {
      name: 'http',
      generate: async () => new Promise<null>(() => undefined),
    };
    const handler = createRecipesGenerateHandler({
      ...dependencies,
      provider,
      config: { ...dependencies.config, providerTimeoutMs: 10 },
    });
    const response = await handler(createRequest({ ...basePayload, idempotencyKey: 'idem_timeout_test_1234' }));
    expect(response.status).toBe(504);
    expect((await response.json()).status).toBe('timeout');
  });
});
