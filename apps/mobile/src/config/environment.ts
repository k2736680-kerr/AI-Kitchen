import type { GenerationApiRequest } from '@ai-kitchen/shared';

export type AppEnvironment = 'development' | 'staging' | 'production';
export type GenerationMode = 'local' | 'remote';

const environmentValue = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const appEnvironment: AppEnvironment = environmentValue === 'staging' || environmentValue === 'production'
  ? environmentValue
  : 'development';
const requestedMode = process.env.EXPO_PUBLIC_GENERATION_MODE ?? 'local';
const generationMode: GenerationMode = appEnvironment === 'development' && requestedMode !== 'remote' ? 'local' : 'remote';
const apiTimeoutValue = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 45_000);

export interface AppEnvironmentConfig {
  readonly environment: AppEnvironment;
  readonly generationMode: GenerationMode;
  readonly apiBaseUrl: string;
  readonly clientVersion: string;
  readonly apiTimeoutMs: number;
  readonly configurationError: string | null;
}

export const environmentConfig: AppEnvironmentConfig = {
  environment: appEnvironment,
  generationMode,
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, ''),
  clientVersion: process.env.EXPO_PUBLIC_CLIENT_VERSION ?? '1.0.0',
  apiTimeoutMs: Number.isFinite(apiTimeoutValue) ? Math.min(45_000, Math.max(1_000, apiTimeoutValue)) : 45_000,
  configurationError: generationMode === 'remote' && !(process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim()
    ? '远程生成服务地址未配置。'
    : null,
};

export function isGenerationApiRequest(value: unknown): value is GenerationApiRequest {
  return typeof value === 'object' && value !== null && 'generationRequest' in value;
}
