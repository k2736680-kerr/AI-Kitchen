import { describe, expect, it } from 'vitest';

import { loadApiConfig } from './config';

describe('loadApiConfig', () => {
  it('accepts unrelated process variables and defaults an empty DashScope base URL', () => {
    const config = loadApiConfig({
      NODE_ENV: 'development',
      MYSQL_HOST: '10.0.30.171',
      MYSQL_DATABASE: 'ai_kitchen',
      MYSQL_USER: 'ai_kitchen_api',
      MYSQL_PASSWORD: 'test-password',
      DASHSCOPE_BASE_URL: '',
      PATH: 'ignored-by-api-config',
    });

    expect(config.mysql).toMatchObject({ host: '10.0.30.171', database: 'ai_kitchen', user: 'ai_kitchen_api' });
    expect(config.dashscope).toMatchObject({ baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKey: undefined, model: 'qwen3.7-plus' });
    expect(config.session.ttlDays).toBe(180);
  });

  it('validates the session TTL range', () => {
    expect(() => loadApiConfig({ MYSQL_HOST: 'db', MYSQL_DATABASE: 'ai_kitchen', MYSQL_USER: 'api', MYSQL_PASSWORD: 'test', SESSION_TTL_DAYS: '0' })).toThrow('SESSION_TTL_DAYS');
  });

  it('does not accept an empty MySQL password', () => {
    expect(() => loadApiConfig({
      MYSQL_HOST: '10.0.30.171',
      MYSQL_DATABASE: 'ai_kitchen',
      MYSQL_USER: 'ai_kitchen_api',
      MYSQL_PASSWORD: '',
    })).toThrow('MYSQL_PASSWORD');
  });
});
