import { z } from 'zod';

import { GenerationRequestSchema, GENERATION_REQUEST_SCHEMA_VERSION } from '../generation/types';
import { RecipeSchema, RECIPE_SCHEMA_VERSION } from '../recipes/types';

export const GENERATION_API_SCHEMA_VERSION = 'v1' as const;
export const GENERATION_API_PATH = '/api/v1/recipes/generate' as const;

export const requestIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{7,127}$/);
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/);

export const generationIdentitySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('guest'), guestId: z.string().trim().min(1).max(120) }).strict(),
  z.object({ type: z.literal('anonymous'), userId: z.string().trim().min(1).max(120) }).strict(),
  z.object({ type: z.literal('registered'), userId: z.string().trim().min(1).max(120) }).strict(),
]);

export const GenerationApiRequestSchema = z.object({
  schemaVersion: z.literal(GENERATION_API_SCHEMA_VERSION),
  requestId: requestIdSchema,
  idempotencyKey: idempotencyKeySchema,
  clientVersion: z.string().trim().min(1).max(80),
  identity: generationIdentitySchema,
  generationRequest: GenerationRequestSchema,
}).strict();

export const GenerationMetadataSchema = z.object({
  source: z.enum(['local', 'deterministic', 'provider']),
  provider: z.string().trim().min(1).max(80).optional(),
  model: z.string().trim().min(1).max(120).optional(),
  generatedAt: z.string().datetime({ offset: true }),
  durationMs: z.number().int().nonnegative(),
  repaired: z.boolean(),
  requestVersion: z.literal(GENERATION_REQUEST_SCHEMA_VERSION),
  recipeSchemaVersion: z.literal(RECIPE_SCHEMA_VERSION),
}).strict();

const validationErrorSchema = z.object({
  code: z.enum([
    'VALIDATION_ERROR',
    'SCHEMA_VERSION_UNSUPPORTED',
    'INVALID_REQUEST',
    'AUTH_REQUIRED',
    'IDEMPOTENCY_CONFLICT',
    'IDEMPOTENCY_IN_PROGRESS',
    'EMPTY_INGREDIENTS',
    'UNKNOWN_INGREDIENT',
    'INGREDIENT_ALLERGEN_CONFLICT',
    'INGREDIENT_EXCLUSION_CONFLICT',
  ]),
  message: z.string().trim().min(1).max(500),
  fieldErrors: z.record(z.string().trim().min(1).max(300)).optional(),
}).strict();

const generationFailedSchema = z.object({
  status: z.literal('generation_failed'),
  schemaVersion: z.literal(GENERATION_API_SCHEMA_VERSION),
  requestId: requestIdSchema.optional(),
  error: z.object({ code: z.literal('GENERATION_FAILED'), message: z.string().trim().min(1).max(500) }).strict(),
}).strict();

const timeoutSchema = z.object({
  status: z.literal('timeout'),
  schemaVersion: z.literal(GENERATION_API_SCHEMA_VERSION),
  requestId: requestIdSchema.optional(),
  error: z.object({ code: z.literal('TIMEOUT'), message: z.string().trim().min(1).max(500) }).strict(),
}).strict();

const serviceUnavailableSchema = z.object({
  status: z.literal('service_unavailable'),
  schemaVersion: z.literal(GENERATION_API_SCHEMA_VERSION),
  requestId: requestIdSchema.optional(),
  error: z.object({ code: z.literal('SERVICE_UNAVAILABLE'), message: z.string().trim().min(1).max(500) }).strict(),
}).strict();

export const GenerationApiSuccessSchema = z.object({
  status: z.literal('success'),
  schemaVersion: z.literal(GENERATION_API_SCHEMA_VERSION),
  requestId: requestIdSchema,
  recipe: RecipeSchema,
  metadata: GenerationMetadataSchema,
}).strict();

export const GenerationApiNoMatchSchema = z.object({
  status: z.literal('no_match'),
  schemaVersion: z.literal(GENERATION_API_SCHEMA_VERSION),
  requestId: requestIdSchema,
  message: z.string().trim().min(1).max(500),
}).strict();

export const GenerationApiValidationErrorSchema = z.object({
  status: z.literal('validation_error'),
  schemaVersion: z.literal(GENERATION_API_SCHEMA_VERSION),
  requestId: requestIdSchema.optional(),
  error: validationErrorSchema,
}).strict();

export const GenerationApiRateLimitedSchema = z.object({
  status: z.literal('rate_limited'),
  schemaVersion: z.literal(GENERATION_API_SCHEMA_VERSION),
  requestId: requestIdSchema.optional(),
  error: z.object({
    code: z.literal('RATE_LIMITED'),
    message: z.string().trim().min(1).max(500),
    retryAfterSeconds: z.number().int().positive().max(3600).optional(),
  }).strict(),
}).strict();

export const GenerationApiIdempotencyConflictSchema = z.object({
  status: z.literal('idempotency_conflict'),
  schemaVersion: z.literal(GENERATION_API_SCHEMA_VERSION),
  requestId: requestIdSchema,
  error: z.object({
    code: z.enum(['IDEMPOTENCY_CONFLICT', 'IDEMPOTENCY_IN_PROGRESS']),
    message: z.string().trim().min(1).max(500),
  }).strict(),
}).strict();

export const GenerationApiFailureSchema = z.discriminatedUnion('status', [
  generationFailedSchema,
  timeoutSchema,
  serviceUnavailableSchema,
]);

export const GenerationApiResponseSchema = z.discriminatedUnion('status', [
  GenerationApiSuccessSchema,
  GenerationApiNoMatchSchema,
  GenerationApiValidationErrorSchema,
  GenerationApiRateLimitedSchema,
  GenerationApiIdempotencyConflictSchema,
  generationFailedSchema,
  timeoutSchema,
  serviceUnavailableSchema,
]);

export type GenerationApiRequest = z.infer<typeof GenerationApiRequestSchema>;
export type GenerationMetadata = z.infer<typeof GenerationMetadataSchema>;
export type GenerationApiSuccess = z.infer<typeof GenerationApiSuccessSchema>;
export type GenerationApiResponse = z.infer<typeof GenerationApiResponseSchema>;
export type GenerationIdentity = z.infer<typeof generationIdentitySchema>;
