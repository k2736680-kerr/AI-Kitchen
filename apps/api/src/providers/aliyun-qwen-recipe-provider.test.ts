import { describe, expect, it, vi } from 'vitest';

import { AliyunQwenRecipeProvider } from './aliyun-qwen-recipe-provider';
import { ProviderRateLimitError, ProviderUnavailableError } from './recipe-provider';

const request = {
  schemaVersion: 'v1' as const,
  locale: 'zh-CN' as const,
  selectedIngredientIds: ['egg', 'tomato', 'noodles'], customIngredients: [], servings: 2 as const, maxCookingTimeMinutes: 30 as const,
  availableTools: [], dietaryPreferences: [], allergens: [], excludedIngredients: [], candidateCount: 4 as const, excludedRecipes: [],
};

function provider(): AliyunQwenRecipeProvider {
  return new AliyunQwenRecipeProvider({ baseUrl: 'https://dashscope.example.com/compatible-mode/v1', apiKey: 'test-key', model: 'qwen3.7-plus', timeoutMs: 30, temperature: 0.8, topP: 0.9 });
}

describe('AliyunQwenRecipeProvider', () => {
  it('uses the OpenAI-compatible JSON configuration and honors diversity parameters', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"status":"no_match"}' } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(provider().generateBatch(request, new AbortController().signal)).resolves.toEqual([null, null, null, null]);
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls).toHaveLength(4);
    const body = JSON.parse(String(calls[0][1].body));
    expect(body).toMatchObject({ model: 'qwen3.7-plus', temperature: 0.8, top_p: 0.9, stream: false, response_format: { type: 'json_object' }, enable_thinking: false });
    expect(body.messages[0].content).toContain('简体中文');
    // 每个候选被分配不同的烹饪方式
    const methods = calls.map((call) => JSON.parse(String(call[1].body)).messages[1].content);
    expect(methods[0]).toContain('stir-fry');
    expect(methods[1]).toContain('stew');
    vi.unstubAllGlobals();
  });

  it('builds an English-only provider prompt for an English request', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"status":"no_match"}' } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(provider().generateBatch({ ...request, locale: 'en-US' }, new AbortController().signal)).resolves.toEqual([null, null, null, null]);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.messages[0].content).toContain('natural American English');
    expect(body.messages[0].content).toContain('不得输出中文');
    vi.unstubAllGlobals();
  });

  it('maps provider 429 and invalid JSON to controlled errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429, headers: { 'retry-after': '7' } })));
    await expect(provider().generateBatch(request, new AbortController().signal)).rejects.toBeInstanceOf(ProviderRateLimitError);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'not-json' } }] }), { status: 200 })));
    await expect(provider().generateBatch(request, new AbortController().signal)).rejects.toBeInstanceOf(ProviderUnavailableError);
    vi.unstubAllGlobals();
  });
});
