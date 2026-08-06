import { z } from 'zod';

export const AUTH_API_SCHEMA_VERSION = 'v1' as const;
export const GUEST_SESSION_API_PATH = '/api/v1/auth/guest-session' as const;
export const SESSION_API_PATH = '/api/v1/auth/session' as const;

export const GuestSubjectSchema = z.object({
  type: z.literal('guest'),
  id: z.string().uuid(),
}).strict();

const expiresAtSchema = z.string().datetime({ offset: true });

export const GuestSessionResponseSchema = z.object({
  schemaVersion: z.literal(AUTH_API_SCHEMA_VERSION),
  subject: GuestSubjectSchema,
  session: z.object({
    token: z.string().min(32).max(4096).optional(),
    refreshToken: z.string().min(12).max(4096).optional(),
    expiresAt: expiresAtSchema,
  }).strict(),
}).strict();

export const SessionResponseSchema = z.object({
  schemaVersion: z.literal(AUTH_API_SCHEMA_VERSION),
  subject: GuestSubjectSchema,
  session: z.object({ expiresAt: expiresAtSchema }).strict(),
}).strict();

export type GuestSessionResponse = z.infer<typeof GuestSessionResponseSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
