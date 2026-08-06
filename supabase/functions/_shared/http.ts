export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-idempotency-key, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function errorBody(code: string, message: string): { schemaVersion: 'v1'; error: { code: string; message: string } } {
  return { schemaVersion: 'v1', error: { code, message } };
}

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) throw new Error('INVALID_JSON');
  try {
    return await request.json();
  } catch {
    throw new Error('INVALID_JSON');
  }
}

export function apiPath(request: Request): string {
  const pathname = new URL(request.url).pathname;
  const index = pathname.indexOf('/api/v1/');
  return index >= 0 ? pathname.slice(index) : pathname;
}
