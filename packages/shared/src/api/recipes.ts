import { z } from 'zod';

import { RecipeSchema } from '../recipes/types';
import { GENERATION_API_SCHEMA_VERSION } from './generation';

export const RECIPE_API_PATH_PREFIX = '/api/v1/recipes' as const;
export const HISTORY_API_PATH = '/api/v1/history' as const;
export const HISTORY_VISIT_API_PATH = '/api/v1/history/visit' as const;

const guestIdSchema = z.string().trim().min(8).max(120);
const recipeIdSchema = z.string().trim().min(1).max(120);
const isoDateTimeSchema = z.string().datetime({ offset: true });

export const RecipeApiResponseSchema = z.object({
  schemaVersion: z.literal(GENERATION_API_SCHEMA_VERSION),
  recipe: RecipeSchema,
}).strict();

export const HistoryVisitRequestSchema = z.object({
  guestId: guestIdSchema,
  recipeId: recipeIdSchema,
  source: z.enum(['local', 'remote']),
}).strict();

export const HistoryEntrySchema = z.object({
  recipe: RecipeSchema,
  source: z.enum(['local', 'remote']),
  firstVisitedAt: isoDateTimeSchema,
  lastVisitedAt: isoDateTimeSchema,
  visitCount: z.number().int().positive(),
}).strict();

export const HistoryListResponseSchema = z.object({
  schemaVersion: z.literal(GENERATION_API_SCHEMA_VERSION),
  items: z.array(HistoryEntrySchema),
  nextCursor: z.string().min(1).max(500).nullable(),
}).strict();

export const HistoryVisitResponseSchema = z.object({
  schemaVersion: z.literal(GENERATION_API_SCHEMA_VERSION),
  recorded: z.literal(true),
}).strict();

export type RecipeApiResponse = z.infer<typeof RecipeApiResponseSchema>;
export type HistoryVisitRequest = z.infer<typeof HistoryVisitRequestSchema>;
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export type HistoryListResponse = z.infer<typeof HistoryListResponseSchema>;
