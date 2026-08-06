import {
  GENERATION_API_SCHEMA_VERSION,
  RECIPE_SCHEMA_VERSION,
  RecipeSchema,
  validateGenerationInput,
  validateRecipeAgainstRequest,
  type AuthenticatedGenerationApiRequest,
  type GenerationApiRequest,
  type GenerationApiResponse,
  type Recipe,
} from '@ai-kitchen/shared';

import type { RecipePersistence } from './recipe-persistence';
import { validateRecipeLanguage } from './recipe-language';
import { ProviderRateLimitError, ProviderTimeoutError, type RecipeProvider } from './recipe-provider';

export interface GenerationServiceConfig {
  readonly totalTimeoutMs: number;
  readonly providerTimeoutMs: number;
  readonly repairEnabled: boolean;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function validationError(requestId: string, code: 'EMPTY_INGREDIENTS' | 'UNKNOWN_INGREDIENT' | 'INGREDIENT_ALLERGEN_CONFLICT' | 'INGREDIENT_EXCLUSION_CONFLICT', message: string): GenerationApiResponse {
  return { status: 'validation_error', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId, error: { code, message } };
}

function failureResponse(status: 'generation_failed' | 'timeout' | 'service_unavailable', requestId: string, message: string): GenerationApiResponse {
  if (status === 'timeout') return { status, schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId, error: { code: 'TIMEOUT', message } };
  if (status === 'service_unavailable') return { status, schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId, error: { code: 'SERVICE_UNAVAILABLE', message } };
  return { status, schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId, error: { code: 'GENERATION_FAILED', message } };
}

async function deadline<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ProviderTimeoutError('菜谱生成超时。'));
      }, timeoutMs);
    });
    return await Promise.race([work(controller.signal), timedOut]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function candidateRecipe(value: unknown, locale: AuthenticatedGenerationApiRequest['generationRequest']['locale']): Recipe | undefined {
  const candidate = typeof value === 'object' && value !== null && 'recipe' in value ? (value as { recipe: unknown }).recipe : value;
  const parsed = RecipeSchema.safeParse(typeof candidate === 'object' && candidate !== null ? { ...candidate as Record<string, unknown>, locale } : candidate);
  return parsed.success ? parsed.data : undefined;
}

export async function createGenerationRequestHash(request: GenerationApiRequest | AuthenticatedGenerationApiRequest): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringify({ clientVersion: request.clientVersion, identity: request.identity, generationRequest: request.generationRequest }));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

export class GenerationService {
  public constructor(
    private readonly persistence: RecipePersistence,
    private readonly provider: RecipeProvider,
    private readonly config: GenerationServiceConfig,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async generate(request: AuthenticatedGenerationApiRequest): Promise<GenerationApiResponse> {
    const issues = validateGenerationInput(request.generationRequest);
    if (issues[0]) return validationError(request.requestId, issues[0].code, issues[0].message);
    const requestHash = await createGenerationRequestHash(request);
    const reservation = await this.persistence.reserveGeneration({ request, requestHash });
    if (reservation.kind === 'replay') return reservation.response;
    if (reservation.kind === 'conflict') return { status: 'idempotency_conflict', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId: request.requestId, error: { code: 'IDEMPOTENCY_CONFLICT', message: '该幂等请求标识已用于其他请求。' } };
    if (reservation.kind === 'in_progress') return { status: 'idempotency_conflict', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId: request.requestId, error: { code: 'IDEMPOTENCY_IN_PROGRESS', message: '相同请求正在处理中，请稍后重试。' } };

    const startedAt = Date.now();
    const completeFailure = async (status: 'failed' | 'timeout' | 'service_unavailable' | 'rate_limited', code: string, response: GenerationApiResponse): Promise<GenerationApiResponse> => {
      await this.persistence.failGeneration({ request, requestHash, status, errorCode: code, durationMs: Date.now() - startedAt }).catch(() => undefined);
      return response;
    };
    const run = <T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> => deadline(work, Math.min(this.config.providerTimeoutMs, this.config.totalTimeoutMs));

    let rawCandidates: ReadonlyArray<unknown | null>;
    try {
      rawCandidates = await run((signal) => this.provider.generateBatch(request.generationRequest, signal));
    } catch (error) {
      if (error instanceof ProviderRateLimitError) {
        const response: GenerationApiResponse = { status: 'rate_limited', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId: request.requestId, error: { code: 'RATE_LIMITED', message: '生成请求过于频繁，请稍后重试。', ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}) } };
        return completeFailure('rate_limited', 'RATE_LIMITED', response);
      }
      if (error instanceof ProviderTimeoutError) return completeFailure('timeout', 'TIMEOUT', failureResponse('timeout', request.requestId, '生成超时，请稍后重试。'));
      return completeFailure('service_unavailable', 'SERVICE_UNAVAILABLE', failureResponse('service_unavailable', request.requestId, '生成服务暂时不可用，请稍后重试。'));
    }

    if (rawCandidates.length === 0 || rawCandidates.every((candidate) => candidate === null)) {
      const response: GenerationApiResponse = { status: 'no_match', schemaVersion: GENERATION_API_SCHEMA_VERSION, requestId: request.requestId, message: '没有找到符合当前条件的菜谱。' };
      await this.persistence.completeGeneration({ request, requestHash, response, status: 'no_match', durationMs: Date.now() - startedAt });
      return response;
    }

    const recipes: Recipe[] = [];
    let repaired = 0;
    for (const rawCandidate of rawCandidates) {
      if (rawCandidate === null) continue;
      let recipe = candidateRecipe(rawCandidate, request.generationRequest.locale);
      let reason = recipe ? this.validationReason(request, recipe) : '菜谱输出不符合结构化 Schema。';
      if ((!recipe || reason) && this.config.repairEnabled && this.provider.repair && repaired < MAX_REPAIR_PER_BATCH) {
        const remaining = this.config.totalTimeoutMs - (Date.now() - startedAt);
        if (remaining > 0) {
          repaired += 1;
          try {
            const fixed = await deadline((signal) => this.provider.repair!({ request: request.generationRequest, candidate: rawCandidate, reason, signal }), Math.min(this.config.providerTimeoutMs, remaining));
            recipe = fixed === null ? undefined : candidateRecipe(fixed, request.generationRequest.locale);
            reason = recipe ? this.validationReason(request, recipe) : '菜谱输出不符合结构化 Schema。';
          } catch (error) {
            if (error instanceof ProviderTimeoutError) return completeFailure('timeout', 'TIMEOUT', failureResponse('timeout', request.requestId, '生成超时，请稍后重试。'));
            return completeFailure('failed', 'GENERATION_FAILED', failureResponse('generation_failed', request.requestId, '菜谱生成失败，请稍后重试。'));
          }
        }
      }
      if (recipe && !reason) recipes.push(recipe);
    }

    const deduped = deduplicateRecipes(recipes, request.generationRequest);
    if (deduped.length === 0) return completeFailure('failed', 'GENERATION_FAILED', failureResponse('generation_failed', request.requestId, '没有得到符合安全条件的菜谱。'));

    const finalRecipes = deduped.map((recipe) => RecipeSchema.parse({ ...recipe, recipeId: globalThis.crypto.randomUUID(), generationMode: 'provider', locale: request.generationRequest.locale }));
    const response: Extract<GenerationApiResponse, { status: 'success' }> = {
      status: 'success',
      schemaVersion: GENERATION_API_SCHEMA_VERSION,
      requestId: request.requestId,
      recipes: finalRecipes,
      metadata: {
        source: 'provider',
        provider: this.provider.name,
        model: this.provider.model,
        generatedAt: this.now().toISOString(),
        durationMs: Date.now() - startedAt,
        repaired: repaired > 0,
        candidateCount: finalRecipes.length,
        requestVersion: request.generationRequest.schemaVersion,
        recipeSchemaVersion: RECIPE_SCHEMA_VERSION,
      },
    };
    try {
      await this.persistence.saveRecipeSuccess({ request, requestHash, response, recipes: finalRecipes, durationMs: response.metadata.durationMs });
      return response;
    } catch {
      return completeFailure('service_unavailable', 'SERVICE_UNAVAILABLE', failureResponse('service_unavailable', request.requestId, '生成结果暂时无法保存，请稍后重试。'));
    }
  }

  private validationReason(request: AuthenticatedGenerationApiRequest, recipe: Recipe): string {
    return [
      ...validateRecipeAgainstRequest(request.generationRequest, recipe).map((issue) => issue.message),
      ...validateRecipeLanguage(recipe, request.generationRequest.locale),
    ].join(' ');
  }
}

const MAX_REPAIR_PER_BATCH = 2;

function deduplicateRecipes(recipes: readonly Recipe[], request: AuthenticatedGenerationApiRequest['generationRequest']): Recipe[] {
  const seen = new Set<string>();
  const excludedKeys = new Set(request.excludedRecipes.map((recipe) => `${recipe.cookingMethod}:${recipe.title.trim()}`));
  const result: Recipe[] = [];
  for (const recipe of recipes) {
    const key = `${recipe.cookingMethod}:${recipe.title.trim()}`;
    if (seen.has(key) || excludedKeys.has(key)) continue;
    seen.add(key);
    result.push(recipe);
  }
  return result;
}
