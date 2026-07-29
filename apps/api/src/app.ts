import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  AuthenticatedGenerationApiRequest,
  AuthenticatedHistoryVisitRequest,
  GuestSessionResponseSchema,
  GENERATION_API_SCHEMA_VERSION,
  GenerationApiRequestSchema,
  HistoryListQuerySchema,
  HistoryListResponseSchema,
  HistoryVisitRequestSchema,
  RecipeApiResponseSchema,
  SessionResponseSchema,
  type GenerationApiResponse,
} from '@ai-kitchen/shared';

import type { ApiConfig } from './config';
import { RateLimiter } from './domain/rate-limiter';
import type { RecipeProvider } from './providers/recipe-provider';
import type { RecipePersistence } from './repositories/recipe-persistence';
import { GenerationService } from './services/generation-service';
import type { GuestSessionIdentity, GuestSessionStore } from './auth/guest-session-store';

declare module 'fastify' {
  interface FastifyRequest {
    identity?: GuestSessionIdentity;
  }
}

export interface ApiDependencies {
  readonly config: ApiConfig;
  readonly persistence: RecipePersistence;
  readonly provider: RecipeProvider;
  readonly sessionStore: GuestSessionStore;
  readonly now?: () => Date;
}

function responseStatus(response: GenerationApiResponse): number {
  if (response.status === 'success' || response.status === 'no_match') return 200;
  if (response.status === 'validation_error') return 422;
  if (response.status === 'rate_limited') return 429;
  if (response.status === 'idempotency_conflict') return 409;
  if (response.status === 'timeout') return 504;
  if (response.status === 'service_unavailable') return 503;
  return 500;
}

function errorBody(code: string, message: string): { schemaVersion: 'v1'; error: { code: string; message: string } } {
  return { schemaVersion: GENERATION_API_SCHEMA_VERSION, error: { code, message } };
}

function bearerToken(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(value.trim());
  return match?.[1] ?? null;
}

async function requireGuestSession(request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply, store: GuestSessionStore): Promise<GuestSessionIdentity | null> {
  const token = bearerToken(request.headers.authorization);
  if (!token) {
    await reply.code(401).send(errorBody('AUTH_REQUIRED', '请先初始化游客会话。'));
    return null;
  }
  const identity = await store.authenticateToken(token);
  if (!identity) {
    await reply.code(401).send(errorBody('AUTH_REQUIRED', '游客会话已失效，请重新初始化。'));
    return null;
  }
  request.identity = identity;
  return identity;
}

export async function createApiApp(dependencies: ApiDependencies): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: dependencies.config.logLevel } });
  const limiter = new RateLimiter();
  const generation = new GenerationService(
    dependencies.persistence,
    dependencies.provider,
    { ...dependencies.config.generation, providerTimeoutMs: dependencies.config.dashscope.timeoutMs },
    dependencies.now,
  );
  await app.register(cors, { origin: dependencies.config.corsOrigin === '*' ? true : dependencies.config.corsOrigin });

  app.get('/api/v1/health', async () => ({
    service: 'ai-kitchen-api',
    version: 'v1',
    environment: dependencies.config.environment,
    database: (await dependencies.persistence.ping()) ? 'connected' : 'unavailable',
    provider: dependencies.config.dashscope.apiKey ? 'configured' : 'unconfigured',
    currentTime: (dependencies.now ?? (() => new Date()))().toISOString(),
  }));

  app.post('/api/v1/auth/guest-session', async (request, reply) => {
    const token = bearerToken(request.headers.authorization);
    if (request.headers.authorization && !token) return reply.code(401).send(errorBody('AUTH_REQUIRED', '会话凭证格式不正确。'));
    if (token) {
      const existing = await dependencies.sessionStore.authenticateToken(token);
      if (!existing) return reply.code(401).send(errorBody('AUTH_REQUIRED', '游客会话已失效，请重新初始化。'));
      return reply.code(200).send(GuestSessionResponseSchema.parse({ schemaVersion: 'v1', subject: { type: 'guest', id: existing.id }, session: { expiresAt: existing.expiresAt } }));
    }
    const created = await dependencies.sessionStore.createGuestSession();
    return reply.code(201).send(GuestSessionResponseSchema.parse({ schemaVersion: 'v1', subject: { type: 'guest', id: created.id }, session: { token: created.token, expiresAt: created.expiresAt } }));
  });

  app.get('/api/v1/auth/session', async (request, reply) => {
    const identity = await requireGuestSession(request, reply, dependencies.sessionStore);
    if (!identity) return;
    return reply.code(200).send(SessionResponseSchema.parse({ schemaVersion: 'v1', subject: { type: 'guest', id: identity.id }, session: { expiresAt: identity.expiresAt } }));
  });

  app.post('/api/v1/recipes/generate', async (request, reply) => {
    const identity = await requireGuestSession(request, reply, dependencies.sessionStore);
    if (!identity) return;
    const parsed = GenerationApiRequestSchema.safeParse(request.body);
    const rawRequestId = typeof request.body === 'object' && request.body !== null && 'requestId' in request.body && typeof request.body.requestId === 'string' ? request.body.requestId : undefined;
    if (!parsed.success) {
      const raw = request.body as { schemaVersion?: unknown; generationRequest?: { schemaVersion?: unknown } } | undefined;
      const versionMismatch = raw?.schemaVersion !== undefined && raw.schemaVersion !== 'v1' || raw?.generationRequest?.schemaVersion !== undefined && raw.generationRequest.schemaVersion !== 'v1';
      return reply.code(400).send({ status: 'validation_error', schemaVersion: GENERATION_API_SCHEMA_VERSION, ...(rawRequestId ? { requestId: rawRequestId } : {}), error: { code: versionMismatch ? 'SCHEMA_VERSION_UNSUPPORTED' : 'VALIDATION_ERROR', message: versionMismatch ? '当前客户端版本暂不受支持。' : '请求参数不完整或格式不正确。' } });
    }
    const input = parsed.data;
    const authenticatedInput: AuthenticatedGenerationApiRequest = { ...input, identity: { type: 'guest', id: identity.id } };
    if (request.headers['x-request-id'] !== input.requestId || request.headers['x-idempotency-key'] !== input.idempotencyKey) {
      return reply.code(400).send({ status: 'validation_error', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId: input.requestId, error: { code: 'INVALID_REQUEST', message: '请求追踪信息不一致。' } });
    }
    const rateKey = identity.id;
    if (!limiter.allow(rateKey, 10)) {
      return reply.code(429).send({ status: 'rate_limited', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId: input.requestId, error: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后重试。', retryAfterSeconds: 60 } });
    }
    try {
      const response = await generation.generate(authenticatedInput);
      request.log.info({ requestId: input.requestId, sessionId: identity.sessionId, status: response.status }, 'recipe_generation_completed');
      return reply.code(responseStatus(response)).send(response);
    } catch {
      request.log.error({ requestId: input.requestId }, 'recipe_generation_unavailable');
      return reply.code(503).send({ status: 'service_unavailable', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId: input.requestId, error: { code: 'SERVICE_UNAVAILABLE', message: '生成服务暂时不可用，请稍后重试。' } });
    }
  });

  app.get('/api/v1/recipes/:recipeId', async (request, reply) => {
    const identity = await requireGuestSession(request, reply, dependencies.sessionStore);
    if (!identity) return;
    const recipeId = (request.params as { recipeId?: string }).recipeId;
    if (!recipeId) return reply.code(400).send(errorBody('INVALID_REQUEST', '菜谱标识不正确。'));
    const recipe = await dependencies.persistence.getRecipe(recipeId, identity.id);
    if (!recipe) return reply.code(404).send(errorBody('NOT_FOUND', '未找到该菜谱。'));
    return reply.code(200).send(RecipeApiResponseSchema.parse({ schemaVersion: GENERATION_API_SCHEMA_VERSION, recipe }));
  });

  app.get('/api/v1/history', async (request, reply) => {
    const identity = await requireGuestSession(request, reply, dependencies.sessionStore);
    if (!identity) return;
    const query = HistoryListQuerySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send(errorBody('INVALID_REQUEST', '历史查询参数不正确。'));
    const page = await dependencies.persistence.listHistory(identity.id, query.data.locale, query.data.limit, query.data.cursor);
    return reply.code(200).send(HistoryListResponseSchema.parse({ schemaVersion: GENERATION_API_SCHEMA_VERSION, ...page }));
  });

  app.post('/api/v1/history/visit', async (request, reply) => {
    const identity = await requireGuestSession(request, reply, dependencies.sessionStore);
    const visit = HistoryVisitRequestSchema.safeParse(request.body);
    if (!visit.success) return reply.code(400).send(errorBody('INVALID_REQUEST', '历史记录参数不正确。'));
    if (!identity) return;
    const authenticatedVisit: AuthenticatedHistoryVisitRequest = { ...visit.data, guestId: identity.id };
    const recorded = await dependencies.persistence.visitHistory(authenticatedVisit);
    if (!recorded) return reply.code(404).send(errorBody('NOT_FOUND', '未找到该菜谱。'));
    return reply.code(200).send({ schemaVersion: GENERATION_API_SCHEMA_VERSION, recorded: true });
  });

  return app;
}
