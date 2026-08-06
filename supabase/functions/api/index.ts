import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

import {
  AliyunQwenRecipeProvider,
  GENERATION_API_SCHEMA_VERSION,
  GenerationApiRequestSchema,
  GenerationService,
  GuestSessionResponseSchema,
  HistoryListQuerySchema,
  HistoryListResponseSchema,
  HistoryVisitRequestSchema,
  RecipeApiResponseSchema,
  SessionResponseSchema,
} from '../_shared/ai-kitchen-core.js';
import { apiPath, corsHeaders, errorBody, jsonResponse, readJson } from '../_shared/http.ts';
import { SupabaseRecipePersistence } from '../_shared/supabase-recipe-persistence.ts';

type RuntimeConfig = {
  readonly supabaseUrl: string;
  readonly anonKey: string;
  readonly serviceRoleKey: string;
  readonly environment: string;
  readonly dashscope: {
    readonly baseUrl: string;
    readonly apiKey?: string;
    readonly model: string;
    readonly timeoutMs: number;
    readonly temperature: number;
    readonly topP: number;
  };
  readonly generation: { readonly totalTimeoutMs: number; readonly repairEnabled: boolean };
};

type Identity = { readonly user: User; readonly client: SupabaseClient; readonly token: string; readonly expiresAt: string };

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function boundedNumber(name: string, fallback: number, minimum: number, maximum: number): number {
  const value = Number(Deno.env.get(name) ?? fallback);
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

function loadConfig(): RuntimeConfig {
  return {
    supabaseUrl: requiredEnv('SUPABASE_URL').replace(/\/$/u, ''),
    anonKey: requiredEnv('SUPABASE_ANON_KEY'),
    serviceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    environment: Deno.env.get('AI_KITCHEN_ENV') ?? 'production',
    dashscope: {
      baseUrl: (Deno.env.get('DASHSCOPE_BASE_URL') ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/u, ''),
      apiKey: Deno.env.get('DASHSCOPE_API_KEY')?.trim() || undefined,
      model: Deno.env.get('DASHSCOPE_MODEL') ?? 'qwen3.7-plus',
      timeoutMs: boundedNumber('DASHSCOPE_TIMEOUT_MS', 35_000, 1_000, 35_000),
      temperature: boundedNumber('DASHSCOPE_TEMPERATURE', 0.8, 0, 1.5),
      topP: boundedNumber('DASHSCOPE_TOP_P', 0.9, 0, 1),
    },
    generation: {
      totalTimeoutMs: boundedNumber('GENERATION_TOTAL_TIMEOUT_MS', 40_000, 1_000, 45_000),
      repairEnabled: (Deno.env.get('GENERATION_REPAIR_ENABLED') ?? 'true') === 'true',
    },
  };
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get('authorization');
  if (!value) return null;
  return /^Bearer\s+([^\s]+)$/iu.exec(value.trim())?.[1] ?? null;
}

function tokenExpiresAt(token: string): string {
  try {
    const payload = token.split('.')[1];
    if (!payload) throw new Error('invalid token');
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const value = JSON.parse(atob(normalized)) as { exp?: unknown };
    if (typeof value.exp !== 'number') throw new Error('invalid token');
    return new Date(value.exp * 1000).toISOString();
  } catch {
    return new Date(Date.now() + 60 * 60 * 1000).toISOString();
  }
}

function userClient(config: RuntimeConfig, token: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function authenticate(request: Request, config: RuntimeConfig): Promise<Identity | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const client = userClient(config, token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, client, token, expiresAt: tokenExpiresAt(token) };
}

function responseStatus(response: { status: string }): number {
  if (response.status === 'success' || response.status === 'no_match') return 200;
  if (response.status === 'validation_error') return 422;
  if (response.status === 'rate_limited') return 429;
  if (response.status === 'idempotency_conflict') return 409;
  if (response.status === 'timeout') return 504;
  if (response.status === 'service_unavailable') return 503;
  return 500;
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const config = loadConfig();
  const path = apiPath(request);

  if (request.method === 'GET' && path === '/api/v1/health') {
    const admin = createClient(config.supabaseUrl, config.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await admin.from('ai_kitchen_recipes').select('recipe_id', { head: true, count: 'exact' }).limit(1);
    return jsonResponse({
      service: 'ai-kitchen-api',
      version: 'v1',
      environment: config.environment,
      database: error ? 'unavailable' : 'connected',
      provider: config.dashscope.apiKey ? 'configured' : 'unconfigured',
      currentTime: new Date().toISOString(),
    }, error ? 503 : 200);
  }

  if (request.method === 'POST' && path === '/api/v1/auth/guest-session') {
    if (request.headers.has('authorization')) {
      const identity = await authenticate(request, config);
      if (!identity) return jsonResponse(errorBody('AUTH_REQUIRED', '游客会话已失效，请重新初始化。'), 401);
      return jsonResponse(GuestSessionResponseSchema.parse({ schemaVersion: 'v1', subject: { type: 'guest', id: identity.user.id }, session: { expiresAt: identity.expiresAt } }));
    }
    const client = createClient(config.supabaseUrl, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    let refreshToken: string | undefined;
    try {
      const body = await readJson(request);
      if (typeof body === 'object' && body !== null && 'refreshToken' in body && typeof body.refreshToken === 'string' && body.refreshToken.length <= 4096) refreshToken = body.refreshToken;
    } catch {
      return jsonResponse(errorBody('INVALID_REQUEST', '请求内容不是有效的 JSON。'), 400);
    }
    const { data, error } = refreshToken
      ? await client.auth.refreshSession({ refresh_token: refreshToken })
      : await client.auth.signInAnonymously();
    if (error || !data.user || !data.session) {
      return refreshToken
        ? jsonResponse(errorBody('AUTH_REQUIRED', '游客会话已失效，请重新初始化。'), 401)
        : jsonResponse(errorBody('SERVICE_UNAVAILABLE', '游客会话暂时无法创建，请稍后重试。'), 503);
    }
    return jsonResponse(GuestSessionResponseSchema.parse({
      schemaVersion: 'v1',
      subject: { type: 'guest', id: data.user.id },
      session: { token: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: new Date(data.session.expires_at! * 1000).toISOString() },
    }), refreshToken ? 200 : 201);
  }

  const identity = await authenticate(request, config);
  if (!identity) return jsonResponse(errorBody('AUTH_REQUIRED', '请先初始化游客会话。'), 401);
  const persistence = new SupabaseRecipePersistence(identity.client);

  if (request.method === 'GET' && path === '/api/v1/auth/session') {
    return jsonResponse(SessionResponseSchema.parse({ schemaVersion: 'v1', subject: { type: 'guest', id: identity.user.id }, session: { expiresAt: identity.expiresAt } }));
  }

  if (request.method === 'POST' && path === '/api/v1/recipes/generate') {
    let body: unknown;
    try { body = await readJson(request); } catch { return jsonResponse(errorBody('INVALID_REQUEST', '请求内容不是有效的 JSON。'), 400); }
    const parsed = GenerationApiRequestSchema.safeParse(body);
    const rawRequestId = typeof body === 'object' && body !== null && 'requestId' in body && typeof body.requestId === 'string' ? body.requestId : undefined;
    if (!parsed.success) {
      const raw = body as { schemaVersion?: unknown; generationRequest?: { schemaVersion?: unknown } } | undefined;
      const versionMismatch = raw?.schemaVersion !== undefined && raw.schemaVersion !== 'v1' || raw?.generationRequest?.schemaVersion !== undefined && raw.generationRequest.schemaVersion !== 'v1';
      return jsonResponse({ status: 'validation_error', schemaVersion: GENERATION_API_SCHEMA_VERSION, ...(rawRequestId ? { requestId: rawRequestId } : {}), error: { code: versionMismatch ? 'SCHEMA_VERSION_UNSUPPORTED' : 'VALIDATION_ERROR', message: versionMismatch ? '当前客户端版本暂不受支持。' : '请求参数不完整或格式不正确。' } }, 400);
    }
    if (request.headers.get('x-request-id') !== parsed.data.requestId || request.headers.get('x-idempotency-key') !== parsed.data.idempotencyKey) {
      return jsonResponse({ status: 'validation_error', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId: parsed.data.requestId, error: { code: 'INVALID_REQUEST', message: '请求追踪信息不一致。' } }, 400);
    }
    const { data: allowed, error: rateError } = await identity.client.rpc('ai_kitchen_allow_request', { p_limit: 10, p_window_seconds: 60 });
    if (rateError) return jsonResponse({ status: 'service_unavailable', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId: parsed.data.requestId, error: { code: 'SERVICE_UNAVAILABLE', message: '生成服务暂时不可用，请稍后重试。' } }, 503);
    if (allowed !== true) return jsonResponse({ status: 'rate_limited', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId: parsed.data.requestId, error: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后重试。', retryAfterSeconds: 60 } }, 429);

    const provider = new AliyunQwenRecipeProvider(config.dashscope);
    const generation = new GenerationService(persistence, provider, { ...config.generation, providerTimeoutMs: config.dashscope.timeoutMs });
    const response = await generation.generate({ ...parsed.data, identity: { type: 'guest', id: identity.user.id } });
    console.info(JSON.stringify({ event: 'recipe_generation_completed', requestId: parsed.data.requestId, status: response.status }));
    return jsonResponse(response, responseStatus(response));
  }

  const recipeMatch = request.method === 'GET' ? /^\/api\/v1\/recipes\/([^/]+)$/u.exec(path) : null;
  if (recipeMatch) {
    const recipeId = decodeURIComponent(recipeMatch[1]);
    if (!validUuid(recipeId)) return jsonResponse(errorBody('INVALID_REQUEST', '菜谱标识不正确。'), 400);
    const recipe = await persistence.getRecipe(recipeId, identity.user.id);
    if (!recipe) return jsonResponse(errorBody('NOT_FOUND', '未找到该菜谱。'), 404);
    return jsonResponse(RecipeApiResponseSchema.parse({ schemaVersion: GENERATION_API_SCHEMA_VERSION, recipe }));
  }

  if (request.method === 'GET' && path === '/api/v1/history') {
    const query = HistoryListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!query.success) return jsonResponse(errorBody('INVALID_REQUEST', '历史查询参数不正确。'), 400);
    const page = await persistence.listHistory(identity.user.id, query.data.locale, query.data.limit, query.data.cursor);
    return jsonResponse(HistoryListResponseSchema.parse({ schemaVersion: GENERATION_API_SCHEMA_VERSION, ...page }));
  }

  if (request.method === 'POST' && path === '/api/v1/history/visit') {
    let body: unknown;
    try { body = await readJson(request); } catch { return jsonResponse(errorBody('INVALID_REQUEST', '请求内容不是有效的 JSON。'), 400); }
    const visit = HistoryVisitRequestSchema.safeParse(body);
    if (!visit.success || !validUuid(visit.data.recipeId)) return jsonResponse(errorBody('INVALID_REQUEST', '历史记录参数不正确。'), 400);
    const recorded = await persistence.visitHistory(visit.data);
    if (!recorded) return jsonResponse(errorBody('NOT_FOUND', '未找到该菜谱。'), 404);
    return jsonResponse({ schemaVersion: GENERATION_API_SCHEMA_VERSION, recorded: true });
  }

  return jsonResponse(errorBody('NOT_FOUND', '接口不存在。'), 404);
}

export default async function handler(request: Request): Promise<Response> {
  try {
    return await handleRequest(request);
  } catch (error) {
    console.error(JSON.stringify({ event: 'api_request_failed', kind: error instanceof Error ? error.message : 'unknown' }));
    return jsonResponse(errorBody('SERVICE_UNAVAILABLE', '服务暂时不可用，请稍后重试。'), 503);
  }
}

if (import.meta.main) Deno.serve(handler);
