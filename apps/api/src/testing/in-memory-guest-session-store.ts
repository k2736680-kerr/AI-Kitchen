import { randomUUID } from 'node:crypto';

import type { GuestSessionIdentity } from '../auth/guest-session-store';
import { createOpaqueSessionToken, hashSessionToken, type CreatedGuestSession, type GuestSessionStore } from '../auth/guest-session-store';

export class InMemoryGuestSessionStore implements GuestSessionStore {
  private readonly sessions = new Map<string, GuestSessionIdentity & { tokenHash: string }>();

  public constructor() {
    this.seed('test-token-a', '00000000-0000-4000-8000-00000000000a');
    this.seed('test-token-b', '00000000-0000-4000-8000-00000000000b');
  }

  public async createGuestSession(): Promise<CreatedGuestSession> {
    const token = createOpaqueSessionToken();
    const identity: GuestSessionIdentity = { type: 'guest', id: randomUUID(), sessionId: randomUUID(), expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() };
    this.sessions.set(identity.sessionId, { ...identity, tokenHash: hashSessionToken(token) });
    return { ...identity, token };
  }

  public async authenticateToken(token: string): Promise<GuestSessionIdentity | null> {
    const tokenHash = hashSessionToken(token);
    const identity = [...this.sessions.values()].find((session) => session.tokenHash === tokenHash && new Date(session.expiresAt).getTime() > Date.now());
    return identity ? { type: 'guest', id: identity.id, sessionId: identity.sessionId, expiresAt: identity.expiresAt } : null;
  }

  private seed(token: string, id: string): void {
    const identity: GuestSessionIdentity = { type: 'guest', id, sessionId: `session-${id}`, expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() };
    this.sessions.set(identity.sessionId, { ...identity, tokenHash: hashSessionToken(token) });
  }
}
