import {
  GenerationApiRequestSchema,
  GenerationApiResponseSchema,
  GENERATION_API_SCHEMA_VERSION,
  RecipeSchema,
  RECIPE_FIXTURES,
  resolveDeterministicRecipe,
  validateGenerationInput,
  validateRecipeAgainstRequest,
  type GenerationApiRequest,
  type GenerationApiResponse,
  type Recipe,
} from '../../../packages/shared/src/index.ts';

type RuntimeEnvironment = 'development' | 'staging' | 'production';
type ProviderName = 'deterministic' | 'http' | 'unavailable';

interface FunctionConfig {
  readonly environment: RuntimeEnvironment;
  readonly provider: ProviderName;
  readonly providerUrl?: string;
  readonly providerRepairUrl?: string;
  readonly providerKey?: string;
  readonly serviceRoleKey?: string;
  readonly providerTimeoutMs: number;
  readonly maxBodyBytes: number;
  readonly rateLimitPerMinute: number;
  readonly useMemoryIdempotency: boolean;
}

interface IdempotencyRecord {
  readonly requestHash: string;
  readonly status: 'processing' | 'completed' | 'failed';
  readonly response?: GenerationApiResponse;
}

type Reservation =
  | { readonly kind: 'new' }
  | { readonly kind: 'replay'; readonly response: GenerationApiResponse }
  | { readonly kind: 'conflict' }
  | { readonly kind: 'in_progress' };

interface IdempotencyStore {
  reserve(key: string, requestHash: string, request: GenerationApiRequest): Promise<Reservation>;
  complete(key: string, requestHash: string, response: GenerationApiResponse): Promise<void>;
  fail(key: string, requestHash: string): Promise<void>;
}

export interface RecipeProvider {
  readonly name: ProviderName;
  generate(request: GenerationApiRequest['generationRequest'], signal: AbortSignal): Promise<unknown | null>;
  repair?(input: {
    readonly request: GenerationApiRequest['generationRequest'];
    readonly candidate: unknown;
    readonly reason: string;
    readonly signal: AbortSignal;
  }): Promise<unknown | null>;
}

export interface HandlerDependencies {
  readonly config: FunctionConfig;
  readonly idempotency: IdempotencyStore;
  readonly provider: RecipeProvider;
  readonly now: () => Date;
  readonly log: (event: string, fields: Readonly<Record<string, string | number | boolean>>) => void;
  readonly rateLimiter: RateLimiter;
}

class ProviderUnavailableError extends Error {}
class ProviderTimeoutError extends Error {}

export class RateLimiter {
  private readonly buckets = new Map<string, { count: number; windowStartedAt: number }>();

  public allow(key: string, limit: number, now: number): boolean {
    const bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStartedAt >= 60_000) {
      this.buckets.set(key, { count: 1, windowStartedAt: now });
      return true;
    }
    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
  }
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  public async reserve(key: string, requestHash: string): Promise<Reservation> {
    const existing = this.records.get(key);
    if (!existing) {
      this.records.set(key, { requestHash, status: 'processing' });
      return { kind: 'new' };
    }
    if (existing.requestHash !== requestHash) return { kind: 'conflict' };
    if (existing.status === 'completed' && existing.response) return { kind: 'replay', response: existing.response };
    if (existing.status === 'processing') return { kind: 'in_progress' };
    this.records.set(key, { requestHash, status: 'processing' });
    return { kind: 'new' };
  }

  public async complete(key: string, requestHash: string, response: GenerationApiResponse): Promise<void> {
    this.records.set(key, { requestHash, status: 'completed', response });
  }

  public async fail(key: string, requestHash: string): Promise<void> {
    this.records.set(key, { requestHash, status: 'failed' });
  }
}

class SupabaseIdempotencyStore implements IdempotencyStore {
  public constructor(private readonly config: FunctionConfig) {}

  private get endpoint(): string {
    const url = Deno.env.get('SUPABASE_URL');
    if (!url || !this.config.serviceRoleKey) throw new ProviderUnavailableError('Idempotency storage is not configured');
    return `${url.replace(/\/$/, '')}/rest/v1/generation_requests`;
  }

  private get headers(): HeadersInit {
    if (!this.config.serviceRoleKey) throw new ProviderUnavailableError('Idempotency storage is not configured');
    return {
      apikey: this.config.serviceRoleKey,
      Authorization: `Bearer ${this.config.serviceRoleKey}`,
      'Content-Type': 'application/json',
    };
  }

  public async reserve(key: string, requestHash: string, request: GenerationApiRequest): Promise<Reservation> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { ...this.headers, Prefer: 'return=minimal' },
      body: JSON.stringify({
        request_id: request.requestId,
        idempotency_key: key,
        request_hash: requestHash,
        request_version: request.generationRequest.schemaVersion,
        identity_type: request.identity.type,
        status: 'processing',
      }),
    });
    if (response.ok) return { kind: 'new' };
    if (response.status !== 409) throw new ProviderUnavailableError('Idempotency storage is unavailable');

    const existingResponse = await fetch(`${this.endpoint}?idempotency_key=eq.${encodeURIComponent(key)}&select=request_hash,status,response_json`, { headers: this.headers });
    if (!existingResponse.ok) throw new ProviderUnavailableError('Idempotency storage is unavailable');
    const rows = await existingResponse.json() as Array<{ request_hash: string; status: string; response_json?: unknown }>;
    const existing = rows[0];
    if (!existing || existing.request_hash !== requestHash) return { kind: 'conflict' };
    if (existing.status === 'completed') {
      const parsed = GenerationApiResponseSchema.safeParse(existing.response_json);
      return parsed.success ? { kind: 'replay', response: parsed.data } : { kind: 'conflict' };
    }
    if (existing.status === 'processing') return { kind: 'in_progress' };
    const retryResponse = await fetch(`${this.endpoint}?idempotency_key=eq.${encodeURIComponent(key)}`, {
      method: 'PATCH',
      headers: { ...this.headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'processing', response_json: null }),
    });
    if (!retryResponse.ok) throw new ProviderUnavailableError('Idempotency storage is unavailable');
    return { kind: 'new' };
  }

  public async complete(key: string, requestHash: string, response: GenerationApiResponse): Promise<void> {
    const result = await fetch(`${this.endpoint}?idempotency_key=eq.${encodeURIComponent(key)}&request_hash=eq.${encodeURIComponent(requestHash)}`, {
      method: 'PATCH',
      headers: { ...this.headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'completed', response_json: response, completed_at: new Date().toISOString() }),
    });
    if (!result.ok) throw new ProviderUnavailableError('Idempotency storage is unavailable');
  }

  public async fail(key: string, requestHash: string): Promise<void> {
    await fetch(`${this.endpoint}?idempotency_key=eq.${encodeURIComponent(key)}&request_hash=eq.${encodeURIComponent(requestHash)}`, {
      method: 'PATCH',
      headers: { ...this.headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'failed' }),
    });
  }
}

export class DeterministicProvider implements RecipeProvider {
  public readonly name = 'deterministic' as const;

  public async generate(request: GenerationApiRequest['generationRequest']): Promise<unknown | null> {
    const result = resolveDeterministicRecipe(request, RECIPE_FIXTURES);
    return result.status === 'success' ? result.recipe : null;
  }
}

class UnavailableProvider implements RecipeProvider {
  public readonly name = 'unavailable' as const;
  public async generate(): Promise<unknown | null> {
    throw new ProviderUnavailableError('Recipe provider is not configured');
  }
}

function buildProviderPayload(request: GenerationApiRequest['generationRequest'], type: 'generate' | 'repair', candidate?: unknown, reason?: string): Record<string, unknown> {
  return {
    type,
    responseFormat: 'recipe.v1.0.0',
    generationRequest: request,
    ...(type === 'repair' ? { candidate, reason } : {}),
  };
}

class HttpRecipeProvider implements RecipeProvider {
  public readonly name = 'http' as const;

  public constructor(private readonly config: FunctionConfig) {}

  public async generate(request: GenerationApiRequest['generationRequest'], signal: AbortSignal): Promise<unknown | null> {
    return this.call(this.config.providerUrl, buildProviderPayload(request, 'generate'), signal);
  }

  public async repair(input: { request: GenerationApiRequest['generationRequest']; candidate: unknown; reason: string; signal: AbortSignal }): Promise<unknown | null> {
    return this.call(this.config.providerRepairUrl ?? this.config.providerUrl, buildProviderPayload(input.request, 'repair', input.candidate, input.reason), input.signal);
  }

  private async call(url: string | undefined, body: unknown, signal: AbortSignal): Promise<unknown | null> {
    if (!url || !this.config.providerKey) throw new ProviderUnavailableError('Recipe provider is not configured');
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${this.config.providerKey}` },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw new ProviderTimeoutError('Recipe provider timed out');
      throw new ProviderUnavailableError('Recipe provider is unavailable');
    }
    if (!response.ok) throw new ProviderUnavailableError('Recipe provider is unavailable');
    try {
      return await response.json();
    } catch {
      throw new Error('Recipe provider returned invalid JSON');
    }
  }
}

function getRuntimeConfig(): FunctionConfig {
  const environment = (Deno.env.get('APP_ENV') ?? 'development') as RuntimeEnvironment;
  const normalizedEnvironment: RuntimeEnvironment = ['development', 'staging', 'production'].includes(environment) ? environment : 'development';
  const requestedProvider = Deno.env.get('GENERATION_PROVIDER') ?? 'unavailable';
  const provider = (normalizedEnvironment === 'development' && requestedProvider === 'deterministic') || requestedProvider === 'http'
    ? requestedProvider as ProviderName
    : 'unavailable';
  return {
    environment: normalizedEnvironment,
    provider: ['deterministic', 'http', 'unavailable'].includes(provider) ? provider : 'unavailable',
    providerUrl: Deno.env.get('RECIPE_PROVIDER_URL') ?? undefined,
    providerRepairUrl: Deno.env.get('RECIPE_PROVIDER_REPAIR_URL') ?? undefined,
    providerKey: Deno.env.get('RECIPE_PROVIDER_KEY') ?? undefined,
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? undefined,
    providerTimeoutMs: Math.min(35_000, Math.max(1_000, Number(Deno.env.get('GENERATION_PROVIDER_TIMEOUT_MS') ?? 30_000))),
    maxBodyBytes: 64 * 1024,
    rateLimitPerMinute: Math.min(60, Math.max(1, Number(Deno.env.get('GENERATION_RATE_LIMIT_PER_MINUTE') ?? 10))),
    useMemoryIdempotency: normalizedEnvironment === 'development' && Deno.env.get('GENERATION_IDEMPOTENCY_STORE') === 'memory',
  };
}

function jsonResponse(body: unknown, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}

function corsHeaders(): HeadersInit {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-request-id, x-idempotency-key', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
}

function errorResponse(status: 'validation_error' | 'rate_limited' | 'generation_failed' | 'timeout' | 'service_unavailable', requestId: string | undefined, message: string, code: string, retryAfterSeconds?: number): GenerationApiResponse {
  if (status === 'validation_error') return { status, schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId, error: { code: code as 'VALIDATION_ERROR', message } };
  if (status === 'rate_limited') return { status, schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId, error: { code: 'RATE_LIMITED', message, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) } };
  if (status === 'timeout') return { status, schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId, error: { code: 'TIMEOUT', message } };
  if (status === 'service_unavailable') return { status, schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId, error: { code: 'SERVICE_UNAVAILABLE', message } };
  return { status: 'generation_failed', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId, error: { code: 'GENERATION_FAILED', message } };
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function withDeadline<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ProviderTimeoutError('Recipe provider timed out'));
      }, timeoutMs);
    });
    return await Promise.race([task(controller.signal), timeout]);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new ProviderTimeoutError('Recipe provider timed out');
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function recipeFromProviderOutput(value: unknown): Recipe | undefined {
  const candidate = typeof value === 'object' && value !== null && 'recipe' in value ? (value as { recipe: unknown }).recipe : value;
  const parsed = RecipeSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

async function executeGeneration(request: GenerationApiRequest, dependencies: HandlerDependencies): Promise<GenerationApiResponse> {
  const startedAt = Date.now();
  const deadline = startedAt + dependencies.config.providerTimeoutMs;
  let repaired = false;
  let repairTimedOut = false;
  let candidate: unknown | null;
  try {
    candidate = await withDeadline((signal) => dependencies.provider.generate(request.generationRequest, signal), dependencies.config.providerTimeoutMs);
  } catch (error) {
    if (error instanceof ProviderTimeoutError) return errorResponse('timeout', request.requestId, '生成超时，请稍后重试。', 'TIMEOUT');
    if (error instanceof ProviderUnavailableError) return errorResponse('service_unavailable', request.requestId, '生成服务暂时不可用，请稍后重试。', 'SERVICE_UNAVAILABLE');
    return errorResponse('generation_failed', request.requestId, '菜谱生成失败，请稍后重试。', 'GENERATION_FAILED');
  }
  if (candidate === null) return { status: 'no_match', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId: request.requestId, message: '没有找到符合当前条件的菜谱。' };

  let recipe = recipeFromProviderOutput(candidate);
  const repair = async (reason: string): Promise<boolean> => {
    if (repaired || !dependencies.provider.repair) return false;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return false;
    repaired = true;
    try {
      candidate = await withDeadline((signal) => dependencies.provider.repair!({ request: request.generationRequest, candidate, reason, signal }), remaining);
      recipe = recipeFromProviderOutput(candidate);
      return Boolean(recipe);
    } catch (error) {
      if (error instanceof ProviderTimeoutError) repairTimedOut = true;
      return false;
    }
  };

  if (!recipe) await repair('菜谱输出不符合结构化 Schema。');
  if (repairTimedOut) return errorResponse('timeout', request.requestId, '生成超时，请稍后重试。', 'TIMEOUT');
  if (!recipe) return errorResponse('generation_failed', request.requestId, '生成结果暂时无法使用，请稍后重试。', 'GENERATION_FAILED');

  let safetyIssues = validateRecipeAgainstRequest(request.generationRequest, recipe);
  if (safetyIssues.length > 0) {
    await repair(safetyIssues.map((issue) => issue.message).join(' '));
    if (repairTimedOut) return errorResponse('timeout', request.requestId, '生成超时，请稍后重试。', 'TIMEOUT');
    if (!recipe) return errorResponse('generation_failed', request.requestId, '没有找到符合安全条件的菜谱。', 'GENERATION_FAILED');
    safetyIssues = validateRecipeAgainstRequest(request.generationRequest, recipe);
  }
  if (safetyIssues.length > 0) return errorResponse('generation_failed', request.requestId, '没有找到符合安全条件的菜谱。', 'GENERATION_FAILED');

  const generatedAt = dependencies.now().toISOString();
  return {
    status: 'success',
    schemaVersion: GENERATION_API_SCHEMA_VERSION,
    requestId: request.requestId,
    recipe,
    metadata: {
      source: dependencies.provider.name === 'deterministic' ? 'deterministic' : 'provider',
      provider: dependencies.provider.name === 'unavailable' ? undefined : dependencies.provider.name,
      generatedAt,
      durationMs: Math.max(0, Date.now() - startedAt),
      repaired,
      requestVersion: request.generationRequest.schemaVersion,
      recipeSchemaVersion: 'recipe.v1.0.0',
    },
  };
}

function identityKey(request: GenerationApiRequest): string {
  return request.identity.type === 'guest' ? `guest:${request.identity.guestId}` : `${request.identity.type}:${request.identity.userId}`;
}

function createDefaultDependencies(): HandlerDependencies {
  const config = getRuntimeConfig();
  const provider: RecipeProvider = config.provider === 'deterministic'
    ? new DeterministicProvider()
    : config.provider === 'http'
      ? new HttpRecipeProvider(config)
      : new UnavailableProvider();
  return {
    config,
    provider,
    idempotency: config.useMemoryIdempotency ? new MemoryIdempotencyStore() : new SupabaseIdempotencyStore(config),
    now: () => new Date(),
    rateLimiter: new RateLimiter(),
    log: (event, fields) => console.log(JSON.stringify({ event, ...fields })),
  };
}

export function createRecipesGenerateHandler(dependencies: HandlerDependencies): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const cors = corsHeaders();
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return jsonResponse(errorResponse('validation_error', undefined, '只支持 POST 请求。', 'INVALID_REQUEST'), 405, cors);
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return jsonResponse(errorResponse('validation_error', undefined, '请求格式不正确。', 'INVALID_REQUEST'), 415, cors);

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > dependencies.config.maxBodyBytes) return jsonResponse(errorResponse('validation_error', undefined, '请求内容过大。', 'INVALID_REQUEST'), 413, cors);
    let payload: unknown;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > dependencies.config.maxBodyBytes) return jsonResponse(errorResponse('validation_error', undefined, '请求内容过大。', 'INVALID_REQUEST'), 413, cors);
      payload = JSON.parse(raw);
    } catch {
      return jsonResponse(errorResponse('validation_error', undefined, '请求内容不是有效 JSON。', 'INVALID_REQUEST'), 400, cors);
    }

    const parsed = GenerationApiRequestSchema.safeParse(payload);
    const rawRequestId = typeof payload === 'object' && payload !== null && 'requestId' in payload && typeof payload.requestId === 'string' ? payload.requestId : undefined;
    if (!parsed.success) {
      const versionMismatch = typeof payload === 'object' && payload !== null && (
        ('schemaVersion' in payload && payload.schemaVersion !== GENERATION_API_SCHEMA_VERSION)
        || ('generationRequest' in payload && typeof payload.generationRequest === 'object' && payload.generationRequest !== null && 'schemaVersion' in payload.generationRequest && payload.generationRequest.schemaVersion !== 'v1')
      );
      return jsonResponse(errorResponse('validation_error', rawRequestId, versionMismatch ? '当前客户端版本暂不受支持。' : '请求参数不完整或格式不正确。', versionMismatch ? 'SCHEMA_VERSION_UNSUPPORTED' : 'VALIDATION_ERROR'), 400, cors);
    }
    const input = parsed.data;
    if (input.generationRequest.schemaVersion !== 'v1') return jsonResponse(errorResponse('validation_error', input.requestId, '当前生成请求版本暂不受支持。', 'SCHEMA_VERSION_UNSUPPORTED'), 400, cors);
    if (request.headers.get('x-request-id') !== input.requestId || request.headers.get('x-idempotency-key') !== input.idempotencyKey) return jsonResponse(errorResponse('validation_error', input.requestId, '请求追踪信息不一致。', 'INVALID_REQUEST'), 400, cors);
    if (input.identity.type !== 'guest') return jsonResponse(errorResponse('validation_error', input.requestId, '当前身份暂未接入，请稍后再试。', 'AUTH_REQUIRED'), 401, cors);

    const inputIssues = validateGenerationInput(input.generationRequest);
    if (inputIssues.length > 0) return jsonResponse(errorResponse('validation_error', input.requestId, inputIssues[0].message, inputIssues[0].code), 422, cors);
    if (!dependencies.rateLimiter.allow(identityKey(input), dependencies.config.rateLimitPerMinute, Date.now())) return jsonResponse(errorResponse('rate_limited', input.requestId, '请求过于频繁，请稍后再试。', 'RATE_LIMITED', 60), 429, cors);

    const requestHash = await sha256(JSON.stringify({ clientVersion: input.clientVersion, identity: input.identity, generationRequest: input.generationRequest }));
    let reservation: Reservation;
    try {
      reservation = await dependencies.idempotency.reserve(input.idempotencyKey, requestHash, input);
    } catch {
      return jsonResponse(errorResponse('service_unavailable', input.requestId, '生成服务暂时不可用，请稍后重试。', 'SERVICE_UNAVAILABLE'), 503, cors);
    }
    if (reservation.kind === 'replay') return jsonResponse(reservation.response, 200, cors);
    if (reservation.kind === 'conflict') return jsonResponse(errorResponse('validation_error', input.requestId, '该幂等请求标识已用于其他请求。', 'IDEMPOTENCY_CONFLICT'), 409, cors);
    if (reservation.kind === 'in_progress') return jsonResponse(errorResponse('validation_error', input.requestId, '相同请求正在处理中，请稍后查询结果。', 'IDEMPOTENCY_IN_PROGRESS'), 409, cors);

    let response: GenerationApiResponse;
    try {
      response = await executeGeneration(input, dependencies);
      await dependencies.idempotency.complete(input.idempotencyKey, requestHash, response);
    } catch {
      await dependencies.idempotency.fail(input.idempotencyKey, requestHash).catch(() => undefined);
      response = errorResponse('service_unavailable', input.requestId, '生成服务暂时不可用，请稍后重试。', 'SERVICE_UNAVAILABLE');
    }
    dependencies.log('recipe_generation_completed', { requestId: input.requestId, status: response.status, provider: dependencies.provider.name, repaired: response.status === 'success' ? response.metadata.repaired : false });
    const httpStatus = response.status === 'success' || response.status === 'no_match' ? 200 : response.status === 'timeout' ? 504 : response.status === 'service_unavailable' ? 503 : response.status === 'rate_limited' ? 429 : response.status === 'validation_error' ? 422 : 500;
    return jsonResponse(response, httpStatus, cors);
  };
}

if (import.meta.main) {
  const dependencies = createDefaultDependencies();
  Deno.serve(createRecipesGenerateHandler(dependencies));
}
