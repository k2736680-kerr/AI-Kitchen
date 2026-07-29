import { describe, expect, it, vi } from 'vitest';

import { GuestSessionService } from './guest-session-service';
import type { SessionStorage } from './session-storage';

class MemorySessionStorage implements SessionStorage {
  public token: string | null = null;
  public expiresAt: string | null = null;
  public async readToken(): Promise<string | null> { return this.token; }
  public async readExpiresAt(): Promise<string | null> { return this.expiresAt; }
  public async writeSession(token: string, expiresAt: string): Promise<void> { this.token = token; this.expiresAt = expiresAt; }
  public async deleteSession(): Promise<void> { this.token = null; this.expiresAt = null; }
}

describe('GuestSessionService', () => {
  it('bootstraps one server guest and shares concurrent initialization', async () => {
    const storage = new MemorySessionStorage();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ schemaVersion: 'v1', subject: { type: 'guest', id: '00000000-0000-4000-8000-000000000001' }, session: { token: 'a'.repeat(43), expiresAt: '2026-12-31T00:00:00.000Z' } }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const service = new GuestSessionService('http://api.test', storage);
    const [first, second] = await Promise.all([service.bootstrapGuestSession(), service.bootstrapGuestSession()]);
    expect(first.subject.id).toBe(second.subject.id);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(storage.token).toBe('a'.repeat(43));
    vi.unstubAllGlobals();
  });

  it('validates an existing token instead of creating another guest', async () => {
    const storage = new MemorySessionStorage();
    storage.token = 'stored-token';
    storage.expiresAt = '2026-12-31T00:00:00.000Z';
    const fetchMock = vi.fn(async (_input: string, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer stored-token' });
      return new Response(JSON.stringify({ schemaVersion: 'v1', subject: { type: 'guest', id: '00000000-0000-4000-8000-000000000002' }, session: { expiresAt: '2026-12-31T00:00:00.000Z' } }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const session = await new GuestSessionService('http://api.test', storage).bootstrapGuestSession();
    expect(session.subject.id).toBe('00000000-0000-4000-8000-000000000002');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
