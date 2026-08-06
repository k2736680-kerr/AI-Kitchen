const SESSION_TOKEN_KEY = 'ai-kitchen.guest.session.token';
const SESSION_EXPIRES_AT_KEY = 'ai-kitchen.guest.session.expires-at';
const SESSION_REFRESH_TOKEN_KEY = 'ai-kitchen.guest.session.refresh-token';

export interface SessionStorage {
  readToken(): Promise<string | null>;
  readExpiresAt(): Promise<string | null>;
  readRefreshToken(): Promise<string | null>;
  writeSession(token: string, expiresAt: string, refreshToken?: string): Promise<void>;
  deleteSession(): Promise<void>;
}

export class SecureSessionStorage implements SessionStorage {
  public async readToken(): Promise<string | null> {
    const secureStore = await import('expo-secure-store');
    return secureStore.getItemAsync(SESSION_TOKEN_KEY);
  }

  public async readExpiresAt(): Promise<string | null> {
    const secureStore = await import('expo-secure-store');
    return secureStore.getItemAsync(SESSION_EXPIRES_AT_KEY);
  }

  public async readRefreshToken(): Promise<string | null> {
    const secureStore = await import('expo-secure-store');
    return secureStore.getItemAsync(SESSION_REFRESH_TOKEN_KEY);
  }

  public async writeSession(token: string, expiresAt: string, refreshToken?: string): Promise<void> {
    const secureStore = await import('expo-secure-store');
    await secureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    await secureStore.setItemAsync(SESSION_EXPIRES_AT_KEY, expiresAt);
    if (refreshToken) await secureStore.setItemAsync(SESSION_REFRESH_TOKEN_KEY, refreshToken);
  }

  public async deleteSession(): Promise<void> {
    const secureStore = await import('expo-secure-store');
    await secureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    await secureStore.deleteItemAsync(SESSION_EXPIRES_AT_KEY);
    await secureStore.deleteItemAsync(SESSION_REFRESH_TOKEN_KEY);
  }
}
