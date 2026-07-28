import { describe, expect, it, vi } from 'vitest';

import { AliyunQwenRecipeProvider } from './aliyun-qwen-recipe-provider';
import { ProviderRateLimitError, ProviderUnavailableError } from './recipe-provider';

const request = {
  schemaVersion: 'v1' as const,
  selectedIngredientIds: ['egg', 'tomato', 'noodles'], customIngredients: [], servings: 2 as const, maxCookingTimeMinutes: 30 as const,
  availableTools: [], dietaryPreferences: [], allergens: [], excludedIngredients: [],
};

function provider(): AliyunQwenRecipeProvider {
  return new AliyunQwenRecipeProvider({ baseUrl: 'https://dashscope.example.com/compatible-mode/v1', apiKey: 'test-key', model: 'qwen3.7-plus', timeoutMs: 30 });
}

describe('AliyunQwenRecipeProvider', () => {
  it('uses the OpenAI-compatible JSON configuration', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"status":"no_match"}' } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(provider().generate(request, new AbortController().signal)).resolves.toBeNull();
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(call[1].body));
    expect(body).toMatchObject({ model: 'qwen3.7-plus', temperature: 0.2, top_p: 0.8, stream: false, response_format: { type: 'json_object' }, enable_thinking: false });
    vi.unstubAllGlobals();
  });

  it('maps provider 429 and invalid JSON to controlled errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429, headers: { 'retry-after': '7' } })));
    await expect(provider().generate(request, new AbortController().signal)).rejects.toBeInstanceOf(ProviderRateLimitError);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'not-json' } }] }), { status: 200 })));
    await expect(provider().generate(request, new AbortController().signal)).rejects.toBeInstanceOf(ProviderUnavailableError);
    vi.unstubAllGlobals();
  });
});
