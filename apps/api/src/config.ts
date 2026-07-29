import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);
const optionalSecret = z.string().trim().optional().transform((value) => value || undefined);
const dashscopeBaseUrl = z.string().trim().optional()
  .transform((value) => value || 'https://dashscope.aliyuncs.com/compatible-mode/v1')
  .pipe(z.string().url());

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  API_HOST: nonEmpty.default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3100),
  API_CORS_ORIGIN: z.string().trim().default('*'),
  DASHSCOPE_BASE_URL: dashscopeBaseUrl,
  DASHSCOPE_API_KEY: optionalSecret,
  DASHSCOPE_MODEL: nonEmpty.default('qwen3.7-plus'),
  DASHSCOPE_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(35_000).default(35_000),
  MYSQL_HOST: nonEmpty,
  MYSQL_PORT: z.coerce.number().int().min(1).max(65_535).default(3306),
  MYSQL_DATABASE: nonEmpty,
  MYSQL_USER: nonEmpty,
  MYSQL_PASSWORD: nonEmpty,
  MYSQL_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(730).default(180),
  GENERATION_TOTAL_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(45_000).default(40_000),
  GENERATION_REPAIR_ENABLED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  GENERATION_MODE: z.literal('remote').default('remote'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
}).strip();

export type ApiConfig = Readonly<{
  environment: 'development' | 'test' | 'staging' | 'production';
  host: string;
  port: number;
  corsOrigin: string;
  dashscope: Readonly<{ baseUrl: string; apiKey?: string; model: string; timeoutMs: number }>;
  mysql: Readonly<{ host: string; port: number; database: string; user: string; password: string; connectionLimit: number }>;
  session: Readonly<{ ttlDays: number }>;
  generation: Readonly<{ totalTimeoutMs: number; repairEnabled: boolean; mode: 'remote' }>;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}>;

export function loadApiConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`API 环境变量配置无效：${missing}`);
  }
  const value = parsed.data;
  return {
    environment: value.NODE_ENV,
    host: value.API_HOST,
    port: value.API_PORT,
    corsOrigin: value.API_CORS_ORIGIN,
    dashscope: { baseUrl: value.DASHSCOPE_BASE_URL.replace(/\/$/, ''), apiKey: value.DASHSCOPE_API_KEY, model: value.DASHSCOPE_MODEL, timeoutMs: value.DASHSCOPE_TIMEOUT_MS },
    mysql: { host: value.MYSQL_HOST, port: value.MYSQL_PORT, database: value.MYSQL_DATABASE, user: value.MYSQL_USER, password: value.MYSQL_PASSWORD, connectionLimit: value.MYSQL_CONNECTION_LIMIT },
    session: { ttlDays: value.SESSION_TTL_DAYS },
    generation: { totalTimeoutMs: value.GENERATION_TOTAL_TIMEOUT_MS, repairEnabled: value.GENERATION_REPAIR_ENABLED, mode: value.GENERATION_MODE },
    logLevel: value.LOG_LEVEL,
  };
}
