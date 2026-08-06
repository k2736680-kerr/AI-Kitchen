import { describe, expect, it, vi } from 'vitest';

import { GuestSessionService } from './guest-session-service';
import type { SessionStorage } from './session-storage';

class MemorySessionStorage implements SessionStorage {
  public token: string | null = null;
  public expiresAt: string | null = null;
  public refreshToken: string | null = null;
  public async readToken(): Promise<string | null> { return this.token; }
  public async readExpiresAt(): Promise<string | null> { return this.expiresAt; }
  public async readRefreshToken(): Promise<string | null> { return this.refreshToken; }
  public async writeSession(token: string, expiresAt: string, refreshToken?: string): Promise<void> { this.token = token; this.expiresAt = expiresAt; this.refreshToken = refreshToken ?? this.refreshToken; }
  public async deleteSession(): Promise<void> { this.token = null; this.expiresAt = null; this.refreshToken = null; }
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

  it('refreshes an expired Supabase access token without creating a new guest', async () => {
    const storage = new MemorySessionStorage();
    storage.token = 'expired-access-token';
    storage.expiresAt = '2026-01-01T00:00:00.000Z';
    storage.refreshToken = 'stored-refresh-token';
    const nextToken = 'b'.repeat(600);
    const fetchMock = vi.fn(async (_input: string, init?: RequestInit) => {
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({ refreshToken: 'stored-refresh-token' });
      return new Response(JSON.stringify({ schemaVersion: 'v1', subject: { type: 'guest', id: '00000000-0000-4000-8000-000000000003' }, session: { token: nextToken, refreshToken: 'rotated-refresh-token', expiresAt: '2026-12-31T00:00:00.000Z' } }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const service = new GuestSessionService('http://api.test', storage);
    const session = await service.bootstrapGuestSession();
    expect(session.subject.id).toBe('00000000-0000-4000-8000-000000000003');
    expect(await service.readToken()).toBe(nextToken);
    expect(storage.refreshToken).toBe('rotated-refresh-token');
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
