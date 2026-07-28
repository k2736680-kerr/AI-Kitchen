import { describe, expect, it } from 'vitest';
import { RECIPE_FIXTURES } from '@ai-kitchen/shared';

import { createApiApp } from './app';
import type { ApiConfig } from './config';
import { ProviderRateLimitError, type RecipeProvider } from './providers/recipe-provider';
import { InMemoryRecipePersistence } from './testing/in-memory-recipe-persistence';

const config: ApiConfig = {
  environment: 'test', host: '127.0.0.1', port: 3100, corsOrigin: '*', logLevel: 'error',
  dashscope: { baseUrl: 'https://dashscope.example.com/compatible-mode/v1', apiKey: 'test-key', model: 'qwen3.7-plus', timeoutMs: 30 },
  mysql: { host: 'localhost', port: 3306, database: 'ai_kitchen', user: 'test', password: 'test', connectionLimit: 1 },
  generation: { totalTimeoutMs: 40, repairEnabled: true, mode: 'remote' },
};

const basePayload = {
  schemaVersion: 'v1', requestId: 'req_api_test_1234', idempotencyKey: 'idem_api_test_1234', clientVersion: '1.0.0',
  identity: { type: 'guest' as const, guestId: 'session-guest-api-test' },
  generationRequest: { schemaVersion: 'v1', selectedIngredientIds: ['egg', 'tomato', 'noodles'], customIngredients: [], servings: 2, maxCookingTimeMinutes: 30, availableTools: [], dietaryPreferences: [], allergens: [], excludedIngredients: [] },
};

function provider(overrides: Partial<RecipeProvider> = {}): RecipeProvider {
  return { name: 'aliyun-dashscope', model: 'qwen3.7-plus', generate: async () => RECIPE_FIXTURES[0], repair: async () => RECIPE_FIXTURES[0], ...overrides };
}

function request(payload: unknown): { payload: string; headers: Record<string, string> } {
  const value = payload as typeof basePayload;
  return { payload: JSON.stringify(payload), headers: { 'content-type': 'application/json', 'x-request-id': value.requestId ?? basePayload.requestId, 'x-idempotency-key': value.idempotencyKey ?? basePayload.idempotencyKey } };
}

describe('Fastify recipe API', () => {
  it('reports health without exposing configuration secrets', async () => {
    const app = await createApiApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider(), now: () => new Date('2026-07-28T00:00:00.000Z') });
    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ service: 'ai-kitchen-api', database: 'connected', provider: 'configured' });
    expect(response.body).not.toContain('test-key');
    await app.close();
  });

  it('generates a persisted recipe, replays it, fetches it, and upserts history', async () => {
    const app = await createApiApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider() });
    const first = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(basePayload) });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json();
    expect(firstBody.status).toBe('success');
    const recipeId = firstBody.recipe.recipeId as string;
    const replay = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(basePayload) });
    expect(replay.json().recipe.recipeId).toBe(recipeId);
    const recipe = await app.inject({ method: 'GET', url: `/api/v1/recipes/${recipeId}` });
    expect(recipe.statusCode).toBe(200);
    const visit = await app.inject({ method: 'POST', url: '/api/v1/history/visit', payload: JSON.stringify({ guestId: basePayload.identity.guestId, recipeId, source: 'remote' }), headers: { 'content-type': 'application/json' } });
    expect(visit.statusCode).toBe(200);
    const history = await app.inject({ method: 'GET', url: `/api/v1/history?guestId=${basePayload.identity.guestId}&limit=20` });
    expect(history.json().items[0].visitCount).toBe(2);
    await app.close();
  });

  it('rejects invalid versions and idempotency conflicts', async () => {
    const persistence = new InMemoryRecipePersistence();
    const app = await createApiApp({ config, persistence, provider: provider() });
    const invalid = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request({ ...basePayload, schemaVersion: 'v2' }) });
    expect(invalid.statusCode).toBe(400);
    const first = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(basePayload) });
    expect(first.statusCode).toBe(200);
    const conflictPayload = { ...basePayload, requestId: 'req_api_conflict_1234', generationRequest: { ...basePayload.generationRequest, servings: 4 } };
    const conflict = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(conflictPayload) });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().status).toBe('idempotency_conflict');
    const malformed = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', payload: '{}', headers: { 'content-type': 'application/json' } });
    expect(malformed.statusCode).toBe(400);
    await app.close();
  });

  it('handles provider timeout, provider rate limits, and one successful repair', async () => {
    const timeoutProvider = provider({ generate: async () => new Promise<null>(() => undefined) });
    const timeoutApp = await createApiApp({ config: { ...config, dashscope: { ...config.dashscope, timeoutMs: 10 }, generation: { ...config.generation, totalTimeoutMs: 10 } }, persistence: new InMemoryRecipePersistence(), provider: timeoutProvider });
    expect((await timeoutApp.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request({ ...basePayload, idempotencyKey: 'idem_api_timeout_1234' }) })).statusCode).toBe(504);
    await timeoutApp.close();

    const limitedApp = await createApiApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider({ generate: async () => { throw new ProviderRateLimitError('limited', 12); } }) });
    expect((await limitedApp.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request({ ...basePayload, idempotencyKey: 'idem_api_limited_1234' }) })).statusCode).toBe(429);
    await limitedApp.close();

    let repairCalls = 0;
    const repairApp = await createApiApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider({ generate: async () => ({ invalid: true }), repair: async () => { repairCalls += 1; return RECIPE_FIXTURES[0]; } }) });
    expect((await repairApp.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request({ ...basePayload, idempotencyKey: 'idem_api_repair_1234' }) })).statusCode).toBe(200);
    expect(repairCalls).toBe(1);
    await repairApp.close();
  });

  it('fails closed when repair cannot fix an invalid or unsafe candidate', async () => {
    let repairCalls = 0;
    const failingApp = await createApiApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider({
      generate: async () => ({ invalid: true }),
      repair: async () => { repairCalls += 1; return { still: 'invalid' }; },
    }) });
    const invalid = await failingApp.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request({ ...basePayload, idempotencyKey: 'idem_api_repair_failure' }) });
    expect(invalid.statusCode).toBe(500);
    expect(repairCalls).toBe(1);
    await failingApp.close();

    const unsafeApp = await createApiApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider({ generate: async () => RECIPE_FIXTURES[0], repair: async () => RECIPE_FIXTURES[0] }) });
    const unsafePayload = { ...basePayload, idempotencyKey: 'idem_api_safety_failure', generationRequest: { ...basePayload.generationRequest, selectedIngredientIds: ['tomato'] } };
    const unsafe = await unsafeApp.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(unsafePayload) });
    expect(unsafe.statusCode).toBe(500);
    expect(unsafe.json().status).toBe('generation_failed');
    await unsafeApp.close();
  });
});
