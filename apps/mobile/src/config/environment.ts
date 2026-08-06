import type { GenerationApiRequest } from '@ai-kitchen/shared';

export type AppEnvironment = 'development' | 'staging' | 'production';
export type GenerationMode = 'local' | 'remote';

export interface AppEnvironmentConfig {
  readonly environment: AppEnvironment;
  readonly generationMode: GenerationMode;
  readonly apiBaseUrl: string;
  readonly clientVersion: string;
  readonly apiTimeoutMs: number;
  readonly configurationError: string | null;
}

type PublicEnvironment = Readonly<Record<string, string | undefined>>;

function isDevelopmentLoopback(url: URL): boolean {
  return url.protocol === 'http:'
    && (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]');
}

export function createEnvironmentConfig(env: PublicEnvironment): AppEnvironmentConfig {
  const environmentValue = env.EXPO_PUBLIC_APP_ENV ?? 'development';
  const appEnvironment: AppEnvironment = environmentValue === 'staging' || environmentValue === 'production'
    ? environmentValue
    : 'development';
  const requestedMode = env.EXPO_PUBLIC_GENERATION_MODE ?? 'local';
  const generationMode: GenerationMode = appEnvironment === 'development' && requestedMode !== 'remote' ? 'local' : 'remote';
  const apiTimeoutValue = Number(env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 45_000);
  const configuredBaseUrl = (env.EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
  let configurationError: string | null = null;

  if (generationMode === 'remote') {
    if (!configuredBaseUrl) {
      configurationError = '远程生成服务地址未配置。';
    } else {
      try {
        const parsedUrl = new URL(configuredBaseUrl);
        const usesHttps = parsedUrl.protocol === 'https:';
        const allowedDevelopmentHttp = appEnvironment === 'development' && isDevelopmentLoopback(parsedUrl);
        if (!usesHttps && !allowedDevelopmentHttp) configurationError = '远程生成服务必须使用 HTTPS。';
      } catch {
        configurationError = '远程生成服务地址格式无效。';
      }
    }
  }

  return {
    environment: appEnvironment,
    generationMode,
    apiBaseUrl: configurationError ? '' : configuredBaseUrl,
    clientVersion: env.EXPO_PUBLIC_CLIENT_VERSION ?? '1.0.0',
    apiTimeoutMs: Number.isFinite(apiTimeoutValue) ? Math.min(45_000, Math.max(1_000, apiTimeoutValue)) : 45_000,
    configurationError,
  };
}

export const environmentConfig = createEnvironmentConfig({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_GENERATION_MODE: process.env.EXPO_PUBLIC_GENERATION_MODE,
  EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL: process.env.EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL,
  EXPO_PUBLIC_CLIENT_VERSION: process.env.EXPO_PUBLIC_CLIENT_VERSION,
  EXPO_PUBLIC_API_TIMEOUT_MS: process.env.EXPO_PUBLIC_API_TIMEOUT_MS,
});

export function isGenerationApiRequest(value: unknown): value is GenerationApiRequest {
  return typeof value === 'object' && value !== null && 'generationRequest' in value;
}
