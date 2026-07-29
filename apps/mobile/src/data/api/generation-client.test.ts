import { describe, expect, it, vi } from 'vitest';

import { GenerationApiClient, GenerationClientError } from './generation-client';
import { RECIPE_FIXTURES, type GenerationApiRequest } from '@ai-kitchen/shared';

const request: GenerationApiRequest = {
  schemaVersion: 'v1',
  requestId: 'req_client_test_1234',
  idempotencyKey: 'idem_client_test_1234',
  clientVersion: '1.0.0',
  identity: { type: 'guest', guestId: 'guest-client-test' },
  generationRequest: {
    schemaVersion: 'v1',
    locale: 'zh-CN',
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

describe('GenerationApiClient', () => {
  it('maps a malformed server payload without exposing it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'internal_error', stack: 'secret' }), { status: 500 })));
    await expect(new GenerationApiClient('http://localhost').generate(request, new AbortController().signal))
      .rejects.toEqual(new GenerationClientError('invalid-response', '生成服务返回了无法识别的结果。'));
    vi.unstubAllGlobals();
  });

  it('returns a validated no-match response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'no_match', schemaVersion: 'v1', requestId: request.requestId, message: '没有找到符合当前条件的菜谱。' }), { status: 200 })));
    const result = await new GenerationApiClient('http://localhost').generate(request, new AbortController().signal);
    expect(result.status).toBe('no_match');
    vi.unstubAllGlobals();
  });

  it('maps an aborted request to a user-facing timeout error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('Aborted', 'AbortError'); }));
    await expect(new GenerationApiClient('http://localhost').generate(request, new AbortController().signal))
      .rejects.toEqual(new GenerationClientError('timeout', '生成请求超时。'));
    vi.unstubAllGlobals();
  });

  it('reads persisted recipe history and records a visit through the remote API', async () => {
    const history = { schemaVersion: 'v1', items: [{ recipe: RECIPE_FIXTURES[0], source: 'remote', firstVisitedAt: '2026-07-28T00:00:00.000Z', lastVisitedAt: '2026-07-28T00:00:00.000Z', visitCount: 1 }], nextCursor: null };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(history), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ schemaVersion: 'v1', recorded: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new GenerationApiClient('http://localhost');
    await expect(client.listHistory('session-guest-client-test', 'zh-CN', new AbortController().signal)).resolves.toMatchObject({ items: [{ recipe: { recipeId: RECIPE_FIXTURES[0].recipeId } }] });
    await expect(client.recordHistoryVisit({ guestId: 'session-guest-client-test', recipeId: RECIPE_FIXTURES[0].recipeId, source: 'remote' }, new AbortController().signal)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/history?');
    expect(fetchMock.mock.calls[0][0]).toContain('locale=zh-CN');
    vi.unstubAllGlobals();
  });
});
