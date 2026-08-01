# 内网菜谱生成 API

## 当前实现状态

- 正式运行平台：`apps/api`，Node.js + TypeScript + Fastify + MySQL。
- AI Provider：阿里云百炼 OpenAI 兼容 Chat Completions；默认 `qwen3.7-plus`。
- Shared Zod 契约、Mobile Local/Remote Repository、请求取消和 45 秒移动端等待上限已实现。
- `GenerationRequest v1` 明确支持 `locale: "zh-CN" | "en-US"`；新版 Mobile 每次显式提交，旧 v1 请求缺失时服务端默认 `zh-CN`。
- MySQL migration、幂等、菜谱快照和 guest 历史 API 已实现。
- 未填写真实环境变量，因此未连接用户 MySQL、未调用阿里云模型、未部署内网 API。

## REST 路径

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/v1/health` | 不泄漏密钥的服务、数据库和 Provider 配置状态 |
| POST | `/api/v1/recipes/generate` | 使用 `GenerationApiRequest v1` 生成并保存菜谱 |
| GET | `/api/v1/recipes/:recipeId` | 读取已校验、已保存的菜谱快照 |
| GET | `/api/v1/history?guestId=&locale=&limit=&cursor=` | guest 当前内容语言的最近菜谱，按访问时间倒序 |
| POST | `/api/v1/history/visit` | 对 `(guestId, recipeId)` 去重 upsert 访问记录 |

生成请求继续使用 `GenerationApiRequest`：`schemaVersion`、`requestId`、`idempotencyKey`、`clientVersion`、`identity` 和 `generationRequest`。`generationRequest.locale` 参与稳定 request hash 和幂等语义，因此相同条件的中文、英文请求不会共享 recipeId；同 locale 的同 idempotencyKey 重放不会重复调用 Provider。生成响应是 `success`、`no_match`、`validation_error`、`rate_limited`、`generation_failed`、`timeout`、`service_unavailable`、`idempotency_conflict` 的严格判别联合。

## 配置

复制 `apps/api/.env.example` 为 `apps/api/.env`，只填写以下值：

```dotenv
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_API_KEY=

MYSQL_HOST=
MYSQL_PORT=3306
MYSQL_DATABASE=ai_kitchen
MYSQL_USER=
MYSQL_PASSWORD=
```

`DASHSCOPE_MODEL` 默认固定为 `qwen3.7-plus`；工作空间或新加坡地域只需通过 `DASHSCOPE_BASE_URL` 覆盖。所有环境变量在启动时由 Zod 校验：MySQL 配置缺失会拒绝启动，阿里云 Key 缺失时 health 仍可工作，生成接口返回 `service_unavailable`。任何服务端密钥都不得使用 `EXPO_PUBLIC_` 前缀。

Mobile 只配置：

```dotenv
EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL=http://内网服务器IP:3100
EXPO_PUBLIC_GENERATION_MODE=remote
```

Mobile 不连接 MySQL，也不调用阿里云模型。

## 数据与安全流水线

生成请求先经过 Zod、食材/过敏原/忌口冲突和限流检查；随后调用模型，提取 `choices[0].message.content`，JSON 解析并通过 `RecipeSchema`、语言一致性、时间、厨具、偏好、过敏原与忌口硬过滤。Provider Prompt 对 `zh-CN` 约束简体中文、对 `en-US` 约束自然美式英语；错误语言最多使用既有 repair 调用修正一次，仍失败则失败关闭。服务端按请求注入并保存 `recipe.locale`，不接受模型自行决定该元数据。原始 Prompt、Authorization Header、模型原始输出、阿里云 Key 和数据库密码均不写入日志或数据库。

首次成功后服务端生成 UUID `recipeId`。同一个 `idempotencyKey` 与相同 request hash 始终重放同一响应与 `recipeId`；不同 hash 返回 `idempotency_conflict`；处理中请求不启动第二次模型调用。

## MySQL migration

```powershell
pnpm --filter @ai-kitchen/api migrate:up
pnpm --filter @ai-kitchen/api migrate:down 001_initial_schema
```

`001_initial_schema.up.sql` 创建 `ai_kitchen_generation_requests`、`ai_kitchen_recipes`、`ai_kitchen_recipe_history` 与 migration 状态表，统一使用 `utf8mb4` 和 UTC。`002_add_recipe_locale.up.sql` 为 generation request 与 recipe 增加非空 `locale`（旧记录默认 `zh-CN`），并建立 recipe locale 查询索引。History 通过 `recipes.locale` 过滤，历史表不复制 locale。正向 migration 会校验已执行文件的 SHA-256；回滚命令必须明确 migration 名。执行回滚会删除或变更数据结构，仅适用于确认无须保留的环境。

## 内网部署

```powershell
pnpm install --frozen-lockfile
pnpm --filter @ai-kitchen/api typecheck
pnpm --filter @ai-kitchen/api build
pnpm --filter @ai-kitchen/api test:build-start
pnpm --filter @ai-kitchen/api migrate:up
pnpm --filter @ai-kitchen/api start
```

API 构建保持 ESM，并将 Fastify、dotenv、mysql2、Zod 等第三方运行时依赖保留为 Node 运行时依赖；项目自身 API 源码与 workspace shared 源码由 esbuild 编译进产物。部署目录必须保留按 lockfile 安装的生产依赖，不能把 `dist/server.js` 当作无依赖单文件分发。`test:build-start` 会用临时本地端口启动构建产物、校验 Health 的数据库与 Provider 状态、终止子进程并确认端口释放，不调用真实 AI 生成。

服务默认监听 `0.0.0.0:3100`。建议使用现有进程守护工具；若服务器没有既定方案，可使用 systemd：

```ini
[Service]
WorkingDirectory=/srv/ai-kitchen
EnvironmentFile=/srv/ai-kitchen/apps/api/.env
ExecStart=/usr/bin/pnpm --filter @ai-kitchen/api start
Restart=always
```

Nginx 可将内网域名 `/api/` 反向代理至 `http://127.0.0.1:3100/api/`。日志由 systemd/journald 或现有日志平台轮转；MySQL 应使用独立备份策略并先验证恢复，不把备份、`.env` 或日志提交到仓库。

## 验证范围

Fastify 注入测试覆盖 health、生成、幂等重放/冲突、Provider 超时/429、一次修复、recipe 读取、history upsert 和 MySQL 事务回滚。真实 MySQL、阿里云百炼和内网部署必须在用户填入上述环境变量后单独联调。
