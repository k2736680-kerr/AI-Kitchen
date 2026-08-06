import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const apiDirectory = fileURLToPath(new URL('.', import.meta.url));
const packageJson = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
const externalRuntimeDependencies = Object.entries(packageJson.dependencies ?? {})
  .filter(([, version]) => !String(version).startsWith('workspace:'))
  .map(([name]) => name);

await build({
  absWorkingDir: apiDirectory,
  entryPoints: {
    server: 'src/server.ts',
    migrate: 'src/scripts/migrate.ts',
  },
  bundle: true,
  external: externalRuntimeDependencies,
  format: 'esm',
  logLevel: 'info',
  outdir: 'dist',
  platform: 'node',
  target: 'node24',
});
