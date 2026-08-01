import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const apiDirectory = fileURLToPath(new URL('..', import.meta.url));
const host = '127.0.0.1';

async function findAvailablePort() {
  const server = createServer();
  server.listen(0, host);
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (!port) throw new Error('无法为构建产物冒烟测试分配端口。');
  return port;
}

async function waitForHealth(url, child) {
  const deadline = Date.now() + 15_000;
  let lastError;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`构建产物在监听前退出，退出码 ${child.exitCode}。`);
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`Health 返回 HTTP ${response.status}。`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw lastError instanceof Error ? lastError : new Error('等待构建产物 Health 超时。');
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  const timeout = setTimeout(() => child.kill('SIGKILL'), 5_000);
  try {
    await once(child, 'exit');
  } finally {
    clearTimeout(timeout);
  }
}

async function assertPortReleased(port) {
  const server = createServer();
  server.listen(port, host);
  try {
    await once(server, 'listening');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

const port = await findAvailablePort();
const child = spawn(process.execPath, ['dist/server.js'], {
  cwd: apiDirectory,
  env: { ...process.env, API_HOST: host, API_PORT: String(port) },
  stdio: ['ignore', 'ignore', 'ignore'],
});

try {
  const response = await waitForHealth(`http://${host}:${port}/api/v1/health`, child);
  const body = await response.json();
  if (body.database !== 'connected') throw new Error(`Health database 状态为 ${String(body.database)}。`);
  if (body.provider !== 'configured') throw new Error(`Health provider 状态为 ${String(body.provider)}。`);
  console.log(`构建产物启动冒烟测试通过：health=200, database=${body.database}, provider=${body.provider}`);
} finally {
  await stopChild(child);
  await assertPortReleased(port);
}
