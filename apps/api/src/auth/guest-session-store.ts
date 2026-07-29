import { createHash, randomBytes, randomUUID } from 'node:crypto';

import type { GuestSubject } from '@ai-kitchen/shared';

import type { ApiConfig } from '../config';
import type { Database } from '../database/mysql-database';

export interface GuestSessionIdentity extends GuestSubject {
  readonly sessionId: string;
  readonly expiresAt: string;
}

export interface CreatedGuestSession extends GuestSessionIdentity {
  readonly token: string;
}

export interface GuestSessionStore {
  createGuestSession(): Promise<CreatedGuestSession>;
  authenticateToken(token: string): Promise<GuestSessionIdentity | null>;
}

export function createOpaqueSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function toIso(value: string | Date): string {
  return new Date(value).toISOString();
}

type SessionRow = {
  session_id: string;
  guest_id: string;
  expires_at: string | Date;
};

export class MySqlGuestSessionStore implements GuestSessionStore {
  public constructor(
    private readonly database: Database,
    private readonly ttlDays: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async createGuestSession(): Promise<CreatedGuestSession> {
    const guestId = randomUUID();
    const sessionId = randomUUID();
    const token = createOpaqueSessionToken();
    const expiresAtDate = new Date(this.now().getTime() + this.ttlDays * 24 * 60 * 60 * 1000);
    await this.database.transaction(async (session) => {
      await session.execute(
        `INSERT INTO ai_kitchen_guest_identities (guest_id, status, last_seen_at)
         VALUES (?, 'active', UTC_TIMESTAMP(3))`,
        [guestId],
      );
      await session.execute(
        `INSERT INTO ai_kitchen_sessions (session_id, guest_id, token_hash, expires_at, last_seen_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))`,
        [sessionId, guestId, hashSessionToken(token), expiresAtDate],
      );
    });
    return { type: 'guest', id: guestId, sessionId, token, expiresAt: expiresAtDate.toISOString() };
  }

  public async authenticateToken(token: string): Promise<GuestSessionIdentity | null> {
    const rows = await this.database.rows<SessionRow>(
      `SELECT s.session_id, s.guest_id, s.expires_at
       FROM ai_kitchen_sessions s
       INNER JOIN ai_kitchen_guest_identities g ON g.guest_id = s.guest_id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > UTC_TIMESTAMP(3)
         AND g.status = 'active'
         AND g.revoked_at IS NULL
       LIMIT 1`,
      [hashSessionToken(token)],
    );
    const row = rows[0];
    if (!row) return null;
    await this.database.transaction(async (session) => {
      await session.execute('UPDATE ai_kitchen_sessions SET last_seen_at = UTC_TIMESTAMP(3) WHERE session_id = ?', [row.session_id]);
      await session.execute('UPDATE ai_kitchen_guest_identities SET last_seen_at = UTC_TIMESTAMP(3) WHERE guest_id = ?', [row.guest_id]);
    });
    return { type: 'guest', id: row.guest_id, sessionId: row.session_id, expiresAt: toIso(row.expires_at) };
  }
}

export function createMySqlGuestSessionStore(database: Database, config: ApiConfig): MySqlGuestSessionStore {
  return new MySqlGuestSessionStore(database, config.session.ttlDays);
}
