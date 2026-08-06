import { build } from 'esbuild';

await build({
  entryPoints: ['packages/server-core/src/index.ts'],
  outfile: 'supabase/functions/_shared/ai-kitchen-core.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  sourcemap: false,
  minify: false,
  legalComments: 'none',
  logLevel: 'info',
});
