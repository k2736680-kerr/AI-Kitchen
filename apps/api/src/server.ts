import 'dotenv/config';

import { createApiApp } from './app';
import { loadApiConfig } from './config';
import { MySqlDatabase } from './database/mysql-database';
import { AliyunQwenRecipeProvider } from './providers/aliyun-qwen-recipe-provider';
import { MySqlRecipePersistence } from './repositories/mysql-recipe-persistence';
import { createMySqlGuestSessionStore } from './auth/guest-session-store';

async function start(): Promise<void> {
  const config = loadApiConfig();
  const database = MySqlDatabase.create(config);
  const app = await createApiApp({
    config,
    persistence: new MySqlRecipePersistence(database),
    sessionStore: createMySqlGuestSessionStore(database, config),
    provider: new AliyunQwenRecipeProvider(config.dashscope),
  });
  app.addHook('onClose', async () => database.close());
  await app.listen({ host: config.host, port: config.port });
}

void start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'API 服务启动失败。';
  console.error(`API 服务启动失败：${message}`);
  process.exitCode = 1;
});
