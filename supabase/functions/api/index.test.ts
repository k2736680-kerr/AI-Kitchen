import { assertEquals } from 'jsr:@std/assert@1';

import handler from './index.ts';

function configureEnvironment(): void {
  Deno.env.set('SUPABASE_URL', 'https://synthetic.supabase.co');
  Deno.env.set('SUPABASE_ANON_KEY', 'synthetic-anon-key');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-service-key');
  Deno.env.set('DASHSCOPE_API_KEY', 'synthetic-provider-key');
}

Deno.test('health supports the mobile base URL path and reports configured dependencies', async () => {
  configureEnvironment();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(new Response(null, { status: 200, headers: { 'content-range': '0-0/0' } }));
  try {
    const response = await handler(new Request('https://synthetic.supabase.co/functions/v1/api/api/v1/health'));
    const body = await response.json();
    assertEquals(response.status, 200);
    assertEquals(body.database, 'connected');
    assertEquals(body.provider, 'configured');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('protected endpoints reject missing Supabase anonymous sessions', async () => {
  configureEnvironment();
  const response = await handler(new Request('https://synthetic.supabase.co/functions/v1/api/api/v1/history?locale=zh-CN'));
  assertEquals(response.status, 401);
  assertEquals((await response.json()).error.code, 'AUTH_REQUIRED');
});

Deno.test('preflight returns mobile-compatible CORS headers', async () => {
  configureEnvironment();
  const response = await handler(new Request('https://synthetic.supabase.co/functions/v1/api/api/v1/recipes/generate', { method: 'OPTIONS' }));
  assertEquals(response.status, 204);
  assertEquals(response.headers.get('access-control-allow-origin'), '*');
});
