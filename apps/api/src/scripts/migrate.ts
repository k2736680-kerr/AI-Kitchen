import 'dotenv/config';

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { loadApiConfig } from '../config';
import { MySqlDatabase } from '../database/mysql-database';

type AppliedMigration = { migration_name: string; checksum: string };

async function run(): Promise<void> {
  const direction = process.argv[2];
  if (direction !== 'up' && direction !== 'down') throw new Error('用法：pnpm migrate:up 或 pnpm migrate:down <迁移名>');
  const config = loadApiConfig();
  const database = MySqlDatabase.create(config);
  const migrationsDirectory = join(process.cwd(), 'migrations');
  try {
    await database.execute(`CREATE TABLE IF NOT EXISTS ai_kitchen_schema_migrations (
      migration_name VARCHAR(160) NOT NULL PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    if (direction === 'up') {
      const names = (await readdir(migrationsDirectory)).filter((name) => name.endsWith('.up.sql')).sort();
      const applied = await database.rows<AppliedMigration>('SELECT migration_name, checksum FROM ai_kitchen_schema_migrations');
      const appliedByName = new Map(applied.map((migration) => [migration.migration_name, migration.checksum]));
      for (const name of names) {
        const sql = await readFile(join(migrationsDirectory, name), 'utf8');
        const checksum = createHash('sha256').update(sql).digest('hex');
        const previousChecksum = appliedByName.get(name);
        if (previousChecksum && previousChecksum !== checksum) throw new Error(`已执行 migration 的内容发生变化：${name}`);
        if (previousChecksum) continue;
        for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map((value) => value.trim()).filter(Boolean)) await database.execute(statement);
        await database.execute('INSERT INTO ai_kitchen_schema_migrations (migration_name, checksum) VALUES (?, ?)', [name, checksum]);
        console.log(`已执行 ${name}`);
      }
      return;
    }
    const migrationName = process.argv[3];
    if (!migrationName) throw new Error('回滚需要明确 migration 名，例如：pnpm migrate:down 001_initial_schema');
    const downName = `${migrationName.replace(/\.up\.sql$/, '')}.down.sql`;
    const sql = await readFile(join(migrationsDirectory, downName), 'utf8');
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map((value) => value.trim()).filter(Boolean)) await database.execute(statement);
    await database.execute('DELETE FROM ai_kitchen_schema_migrations WHERE migration_name = ?', [`${migrationName.replace(/\.up\.sql$/, '')}.up.sql`]);
    console.log(`已回滚 ${migrationName}`);
  } finally {
    await database.close();
  }
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Migration 执行失败。';
  console.error(`Migration 失败：${message}`);
  process.exitCode = 1;
});
