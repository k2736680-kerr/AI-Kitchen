import { describe, expect, it } from 'vitest';

import { createEnvironmentConfig } from './environment';

describe('createEnvironmentConfig', () => {
  it('keeps the production API on the configured HTTPS origin', () => {
    const config = createEnvironmentConfig({
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_GENERATION_MODE: 'remote',
      EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL: 'https://api.example.test/',
    });

    expect(config.apiBaseUrl).toBe('https://api.example.test');
    expect(config.configurationError).toBeNull();
  });

  it('blocks HTTP for production and staging remote APIs', () => {
    for (const environment of ['production', 'staging']) {
      const config = createEnvironmentConfig({
        EXPO_PUBLIC_APP_ENV: environment,
        EXPO_PUBLIC_GENERATION_MODE: 'remote',
        EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL: 'http://10.0.0.25:3100',
      });

      expect(config.apiBaseUrl).toBe('');
      expect(config.configurationError).toBe('远程生成服务必须使用 HTTPS。');
    }
  });

  it('only permits HTTP for loopback development testing', () => {
    const loopback = createEnvironmentConfig({
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_GENERATION_MODE: 'remote',
      EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL: 'http://127.0.0.1:3100',
    });
    const lan = createEnvironmentConfig({
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_GENERATION_MODE: 'remote',
      EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL: 'http://10.0.0.25:3100',
    });

    expect(loopback.configurationError).toBeNull();
    expect(lan.configurationError).toBe('远程生成服务必须使用 HTTPS。');
  });

  it('does not require an API URL in local development mode', () => {
    const config = createEnvironmentConfig({});

    expect(config.generationMode).toBe('local');
    expect(config.configurationError).toBeNull();
  });
});
