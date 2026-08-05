import { describe, expect, it } from 'vitest';
import { RECIPE_FIXTURES } from '@ai-kitchen/shared';

import { createApiApp } from './app';
import type { ApiConfig } from './config';
import { ProviderRateLimitError, type RecipeProvider } from './providers/recipe-provider';
import { createGenerationRequestHash } from './services/generation-service';
import { InMemoryRecipePersistence } from './testing/in-memory-recipe-persistence';
import { InMemoryGuestSessionStore } from './testing/in-memory-guest-session-store';
import type { ApiDependencies } from './app';

const config: ApiConfig = {
  environment: 'test', host: '127.0.0.1', port: 3100, corsOrigin: '*', logLevel: 'error',
  dashscope: { baseUrl: 'https://dashscope.example.com/compatible-mode/v1', apiKey: 'test-key', model: 'qwen3.7-plus', timeoutMs: 30, temperature: 0.8, topP: 0.9 },
  mysql: { host: 'localhost', port: 3306, database: 'ai_kitchen', user: 'test', password: 'test', connectionLimit: 1 },
  session: { ttlDays: 180 },
  generation: { totalTimeoutMs: 40, repairEnabled: true, mode: 'remote' },
};

const sessionStore = new InMemoryGuestSessionStore();
const authHeaders = { authorization: 'Bearer test-token-a' };
function createTestApp(dependencies: Omit<ApiDependencies, 'sessionStore'>) {
  return createApiApp({ ...dependencies, sessionStore });
}

const basePayload = {
  schemaVersion: 'v1', requestId: 'req_api_test_1234', idempotencyKey: 'idem_api_test_1234', clientVersion: '1.0.0',
  identity: { type: 'guest' as const, guestId: 'session-guest-api-test' },
  generationRequest: { schemaVersion: 'v1', locale: 'zh-CN', selectedIngredientIds: ['egg', 'tomato', 'noodles'], customIngredients: [], servings: 2, maxCookingTimeMinutes: 30, availableTools: [], dietaryPreferences: [], allergens: [], excludedIngredients: [], candidateCount: 4, excludedRecipes: [] },
};

const englishRecipe = {
  ...RECIPE_FIXTURES[0],
  locale: 'en-US' as const,
  title: 'Tomato egg noodles',
  description: 'A quick bowl of noodles with tomato and egg.',
  steps: RECIPE_FIXTURES[0].steps.map((step, index) => ({ ...step, title: `Step ${index + 1}`, instruction: `Cook the ingredients for step ${index + 1}.` })),
  safetyNotices: [{ ...RECIPE_FIXTURES[0].safetyNotices[0], message: 'Check ingredients and cookware before serving.' }],
};

function provider(overrides: Partial<RecipeProvider> = {}): RecipeProvider {
  return { name: 'aliyun-dashscope', model: 'qwen3.7-plus', generateBatch: async (generationRequest) => [generationRequest.locale === 'en-US' ? englishRecipe : RECIPE_FIXTURES[0]], repair: async (input) => input.request.locale === 'en-US' ? englishRecipe : RECIPE_FIXTURES[0], ...overrides };
}

function request(payload: unknown): { payload: string; headers: Record<string, string> } {
  const value = payload as typeof basePayload;
  return { payload: JSON.stringify(payload), headers: { ...authHeaders, 'content-type': 'application/json', 'x-request-id': value.requestId ?? basePayload.requestId, 'x-idempotency-key': value.idempotencyKey ?? basePayload.idempotencyKey } };
}

function requestAs(payload: unknown, token: string): { payload: string; headers: Record<string, string> } {
  const value = payload as typeof basePayload;
  return { payload: JSON.stringify(payload), headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-request-id': value.requestId ?? basePayload.requestId, 'x-idempotency-key': value.idempotencyKey ?? basePayload.idempotencyKey } };
}

describe('Fastify recipe API', () => {
  it('reports health without exposing configuration secrets', async () => {
    const app = await createTestApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider(), now: () => new Date('2026-07-28T00:00:00.000Z') });
    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ service: 'ai-kitchen-api', database: 'connected', provider: 'configured' });
    expect(response.body).not.toContain('test-key');
    await app.close();
  });

  it('generates a persisted recipe, replays it, fetches it, and upserts history', async () => {
    const app = await createTestApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider() });
    const first = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(basePayload) });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json();
    expect(firstBody.status).toBe('success');
    const recipeId = firstBody.recipes[0].recipeId as string;
    const replay = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(basePayload) });
    expect(replay.json().recipes[0].recipeId).toBe(recipeId);
    const recipe = await app.inject({ method: 'GET', url: `/api/v1/recipes/${recipeId}`, headers: authHeaders });
    expect(recipe.statusCode).toBe(200);
    const visit = await app.inject({ method: 'POST', url: '/api/v1/history/visit', payload: JSON.stringify({ guestId: 'forged-guest', recipeId, source: 'remote' }), headers: { ...authHeaders, 'content-type': 'application/json' } });
    expect(visit.statusCode).toBe(200);
    const history = await app.inject({ method: 'GET', url: '/api/v1/history?guestId=forged-guest&limit=20', headers: authHeaders });
    expect(history.json().items[0].visitCount).toBe(2);
    await app.close();
  });

  it('includes locale in the stable hash, replay semantics, and history filtering', async () => {
    const zh = { ...basePayload, generationRequest: { ...basePayload.generationRequest, locale: 'zh-CN' as const } };
    const en = { ...basePayload, requestId: 'req_api_english_1234', idempotencyKey: 'idem_api_english_1234', generationRequest: { ...basePayload.generationRequest, locale: 'en-US' as const } };
    const zhRequest = (await import('@ai-kitchen/shared')).GenerationApiRequestSchema.parse(zh);
    const enRequest = (await import('@ai-kitchen/shared')).GenerationApiRequestSchema.parse(en);
    expect(createGenerationRequestHash(zhRequest)).not.toBe(createGenerationRequestHash(enRequest));
    expect(createGenerationRequestHash(enRequest)).toBe(createGenerationRequestHash(enRequest));

    let providerCalls = 0;
    const app = await createTestApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider({ generateBatch: async (generationRequest) => { providerCalls += 1; return [generationRequest.locale === 'en-US' ? englishRecipe : RECIPE_FIXTURES[0]]; } }) });
    const zhResponse = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(zh) });
    const enResponse = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(en) });
    const replay = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(en) });
    expect(zhResponse.json().recipes[0].recipeId).not.toBe(enResponse.json().recipes[0].recipeId);
    expect(enResponse.json().recipes[0]).toMatchObject({ locale: 'en-US', title: 'Tomato egg noodles' });
    expect(replay.json().recipes[0].recipeId).toBe(enResponse.json().recipes[0].recipeId);
    expect(providerCalls).toBe(2);
    const zhHistory = await app.inject({ method: 'GET', url: `/api/v1/history?guestId=forged-guest&locale=zh-CN`, headers: authHeaders });
    const enHistory = await app.inject({ method: 'GET', url: `/api/v1/history?guestId=forged-guest&locale=en-US`, headers: authHeaders });
    expect(zhHistory.json().items).toHaveLength(1);
    expect(zhHistory.json().items[0].recipe.locale).toBe('zh-CN');
    expect(enHistory.json().items).toHaveLength(1);
    expect(enHistory.json().items[0].recipe.locale).toBe('en-US');
    await app.close();
  });

  it('uses the single repair call for a wrong-language provider candidate and fails closed if it stays wrong', async () => {
    const english = { ...basePayload, requestId: 'req_api_language_repair', idempotencyKey: 'idem_api_language_repair', generationRequest: { ...basePayload.generationRequest, locale: 'en-US' as const } };
    let repairCalls = 0;
    const repairedApp = await createTestApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider({
      generateBatch: async () => [RECIPE_FIXTURES[0]],
      repair: async () => { repairCalls += 1; return englishRecipe; },
    }) });
    const repaired = await repairedApp.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(english) });
    expect(repaired.statusCode).toBe(200);
    expect(repaired.json().metadata.repaired).toBe(true);
    expect(repairCalls).toBe(1);
    await repairedApp.close();

    const failedApp = await createTestApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider({
      generateBatch: async () => [RECIPE_FIXTURES[0]], repair: async () => RECIPE_FIXTURES[0],
    }) });
    const failed = await failedApp.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request({ ...english, requestId: 'req_api_language_failed', idempotencyKey: 'idem_api_language_failed' }) });
    expect(failed.statusCode).toBe(500);
    expect(failed.json().status).toBe('generation_failed');
    await failedApp.close();
  });

  it('rejects invalid versions and idempotency conflicts', async () => {
    const persistence = new InMemoryRecipePersistence();
    const app = await createTestApp({ config, persistence, provider: provider() });
    const invalid = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request({ ...basePayload, schemaVersion: 'v2' }) });
    expect(invalid.statusCode).toBe(400);
    const first = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(basePayload) });
    expect(first.statusCode).toBe(200);
    const conflictPayload = { ...basePayload, requestId: 'req_api_conflict_1234', generationRequest: { ...basePayload.generationRequest, servings: 4 } };
    const conflict = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(conflictPayload) });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().status).toBe('idempotency_conflict');
    const malformed = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', payload: '{}', headers: { ...authHeaders, 'content-type': 'application/json' } });
    expect(malformed.statusCode).toBe(400);
    await app.close();
  });

  it('handles provider timeout, provider rate limits, and one successful repair', async () => {
    const timeoutProvider = provider({ generateBatch: async () => new Promise<null[]>(() => undefined) });
    const timeoutApp = await createTestApp({ config: { ...config, dashscope: { ...config.dashscope, timeoutMs: 10 }, generation: { ...config.generation, totalTimeoutMs: 10 } }, persistence: new InMemoryRecipePersistence(), provider: timeoutProvider });
    expect((await timeoutApp.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request({ ...basePayload, idempotencyKey: 'idem_api_timeout_1234' }) })).statusCode).toBe(504);
    await timeoutApp.close();

    const limitedApp = await createTestApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider({ generateBatch: async () => { throw new ProviderRateLimitError('limited', 12); } }) });
    expect((await limitedApp.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request({ ...basePayload, idempotencyKey: 'idem_api_limited_1234' }) })).statusCode).toBe(429);
    await limitedApp.close();

    let repairCalls = 0;
    const repairApp = await createTestApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider({ generateBatch: async () => [{ invalid: true }], repair: async () => { repairCalls += 1; return RECIPE_FIXTURES[0]; } }) });
    expect((await repairApp.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request({ ...basePayload, idempotencyKey: 'idem_api_repair_1234' }) })).statusCode).toBe(200);
    expect(repairCalls).toBe(1);
    await repairApp.close();
  });

  it('fails closed when repair cannot fix an invalid or unsafe candidate', async () => {
    let repairCalls = 0;
    const failingApp = await createTestApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider({
      generateBatch: async () => [{ invalid: true }],
      repair: async () => { repairCalls += 1; return { still: 'invalid' }; },
    }) });
    const invalid = await failingApp.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request({ ...basePayload, idempotencyKey: 'idem_api_repair_failure' }) });
    expect(invalid.statusCode).toBe(500);
    expect(repairCalls).toBe(1);
    await failingApp.close();

    const unsafeApp = await createTestApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider({ generateBatch: async () => [RECIPE_FIXTURES[0]], repair: async () => RECIPE_FIXTURES[0] }) });
    const unsafePayload = { ...basePayload, idempotencyKey: 'idem_api_safety_failure', generationRequest: { ...basePayload.generationRequest, selectedIngredientIds: ['tomato'] } };
    const unsafe = await unsafeApp.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request(unsafePayload) });
    expect(unsafe.statusCode).toBe(500);
    expect(unsafe.json().status).toBe('generation_failed');
    await unsafeApp.close();
  });

  it('requires a session and isolates guest recipe/history ownership', async () => {
    const persistence = new InMemoryRecipePersistence();
    const app = await createTestApp({ config, persistence, provider: provider() });
    const missingHeaders = { ...request(basePayload).headers };
    delete missingHeaders.authorization;
    const missing = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...request({ ...basePayload, idempotencyKey: 'idem_api_missing_auth' }), headers: missingHeaders });
    expect(missing.statusCode).toBe(401);

    const generated = await app.inject({ method: 'POST', url: '/api/v1/recipes/generate', ...requestAs({ ...basePayload, requestId: 'req_guest_a_123456', idempotencyKey: 'idem_guest_a_123456' }, 'test-token-a') });
    const recipeId = generated.json().recipes[0].recipeId as string;
    const guestBDetail = await app.inject({ method: 'GET', url: `/api/v1/recipes/${recipeId}`, headers: { authorization: 'Bearer test-token-b' } });
    expect(guestBDetail.statusCode).toBe(404);
    const guestBHistory = await app.inject({ method: 'GET', url: '/api/v1/history?guestId=00000000-0000-4000-8000-00000000000a', headers: { authorization: 'Bearer test-token-b' } });
    expect(guestBHistory.statusCode).toBe(200);
    expect(guestBHistory.json().items).toHaveLength(0);
    const forgedVisit = await app.inject({ method: 'POST', url: '/api/v1/history/visit', payload: JSON.stringify({ guestId: '00000000-0000-4000-8000-00000000000a', recipeId, source: 'remote' }), headers: { authorization: 'Bearer test-token-b', 'content-type': 'application/json' } });
    expect(forgedVisit.statusCode).toBe(404);
    await app.close();
  });

  it('creates and validates a guest session without exposing token hashes', async () => {
    const app = await createTestApp({ config, persistence: new InMemoryRecipePersistence(), provider: provider() });
    const created = await app.inject({ method: 'POST', url: '/api/v1/auth/guest-session' });
    expect(created.statusCode).toBe(201);
    expect(created.json().subject.type).toBe('guest');
    expect(created.json().session.token).toBeTruthy();
    expect(JSON.stringify(created.json())).not.toContain('token_hash');
    const session = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { authorization: `Bearer ${created.json().session.token}` } });
    expect(session.statusCode).toBe(200);
    expect(session.json().subject.id).toBe(created.json().subject.id);
    expect(session.json().session.token).toBeUndefined();
    await app.close();
  });
});
