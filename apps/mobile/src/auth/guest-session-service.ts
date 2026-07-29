import {
  GUEST_SESSION_API_PATH,
  GuestSessionResponseSchema,
  SESSION_API_PATH,
  SessionResponseSchema,
  type GuestSubject,
} from '@ai-kitchen/shared';

import { SecureSessionStorage, type SessionStorage } from './session-storage';

export type GuestSessionErrorKind = 'configuration' | 'network' | 'invalid-response' | 'unauthorized' | 'storage';

export class GuestSessionError extends Error {
  public constructor(public readonly kind: GuestSessionErrorKind, message: string) {
    super(message);
    this.name = 'GuestSessionError';
  }
}

export interface GuestSessionSnapshot {
  readonly subject: GuestSubject;
  readonly expiresAt: string;
}

export class GuestSessionService {
  private bootstrapPromise: Promise<GuestSessionSnapshot> | null = null;
  private current: GuestSessionSnapshot | null = null;

  public constructor(
    private readonly baseUrl: string,
    private readonly storage: SessionStorage = new SecureSessionStorage(),
  ) {}

  public bootstrapGuestSession(): Promise<GuestSessionSnapshot> {
    if (this.current) return Promise.resolve(this.current);
    if (this.bootstrapPromise) return this.bootstrapPromise;
    this.bootstrapPromise = this.bootstrapOnce().finally(() => { this.bootstrapPromise = null; });
    return this.bootstrapPromise;
  }

  public async readToken(): Promise<string | null> {
    return this.storage.readToken();
  }

  public getCurrentIdentity(): GuestSubject | null {
    return this.current?.subject ?? null;
  }

  private async bootstrapOnce(): Promise<GuestSessionSnapshot> {
    if (!this.baseUrl) throw new GuestSessionError('configuration', '远程生成服务地址未配置。');
    let token: string | null;
    try {
      token = await this.storage.readToken();
    } catch {
      throw new GuestSessionError('storage', '无法读取游客会话，请稍后重试。');
    }
    if (token) {
      const response = await this.request(SESSION_API_PATH, token);
      const parsed = SessionResponseSchema.safeParse(response);
      if (!parsed.success) throw new GuestSessionError('invalid-response', '游客会话服务返回了无法识别的结果。');
      this.current = { subject: parsed.data.subject, expiresAt: parsed.data.session.expiresAt };
      return this.current;
    }

    const response = await this.request(GUEST_SESSION_API_PATH);
    const parsed = GuestSessionResponseSchema.safeParse(response);
    if (!parsed.success || !parsed.data.session.token) throw new GuestSessionError('invalid-response', '游客会话服务返回了无法识别的结果。');
    try {
      await this.storage.writeSession(parsed.data.session.token, parsed.data.session.expiresAt);
    } catch {
      throw new GuestSessionError('storage', '无法安全保存游客会话，请稍后重试。');
    }
    this.current = { subject: parsed.data.subject, expiresAt: parsed.data.session.expiresAt };
    return this.current;
  }

  private async request(path: string, token?: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: path === GUEST_SESSION_API_PATH ? 'POST' : 'GET',
        headers: { Accept: 'application/json', ...(path === GUEST_SESSION_API_PATH ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(path === GUEST_SESSION_API_PATH ? { body: '{}' } : {}),
      });
    } catch {
      throw new GuestSessionError('network', '暂时无法连接游客会话服务。');
    }
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new GuestSessionError('invalid-response', '游客会话服务返回了无法识别的结果。'); }
    if (response.status === 401) throw new GuestSessionError('unauthorized', '游客会话已失效，请重试。');
    if (!response.ok) throw new GuestSessionError('network', '游客会话服务暂时不可用。');
    return payload;
  }
}
