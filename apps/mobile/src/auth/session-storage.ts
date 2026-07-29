const SESSION_TOKEN_KEY = 'ai-kitchen.guest.session.token';
const SESSION_EXPIRES_AT_KEY = 'ai-kitchen.guest.session.expires-at';

export interface SessionStorage {
  readToken(): Promise<string | null>;
  readExpiresAt(): Promise<string | null>;
  writeSession(token: string, expiresAt: string): Promise<void>;
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

  public async writeSession(token: string, expiresAt: string): Promise<void> {
    const secureStore = await import('expo-secure-store');
    await secureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    await secureStore.setItemAsync(SESSION_EXPIRES_AT_KEY, expiresAt);
  }

  public async deleteSession(): Promise<void> {
    const secureStore = await import('expo-secure-store');
    await secureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    await secureStore.deleteItemAsync(SESSION_EXPIRES_AT_KEY);
  }
}
