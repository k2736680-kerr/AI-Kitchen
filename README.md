# AI Kitchen

AI Kitchen 是一款 React Native + Expo 的 AI 厨房助手。用户选择现有食材、人数、时间、厨具和饮食限制，服务端生成结构化菜谱，并经过确定性业务、食品安全和语言校验后返回移动端。

## 当前状态

| 项目 | 状态 |
|---|---|
| Mobile | Expo SDK 57 / React Native / TypeScript，Android 优先 |
| 正式后端 | Supabase anonymous Auth + PostgreSQL/RLS + Edge Function |
| AI Provider | 阿里云百炼 DashScope，密钥只保存在 Supabase Function Secret |
| 生产 API | `https://dthfeeafcecfmxghjnbo.supabase.co/functions/v1/api` |
| Android 产物 | `artifacts/android/ai-kitchen-1.0.0-arm64-supabase.apk` |
| 当前待办 | ARM64 真机安装与外网体验验收 |

旧服务器 `10.0.30.171` 上的 AI Kitchen 容器、镜像、网络、代码、证书、定时任务、构建缓存、MySQL 数据库和账号已全部删除。旧 Fastify/MySQL 源码仅作为历史兼容与测试参考，不是运行或回滚环境。

## 目录

```text
apps/mobile/              Expo 移动端
apps/api/                 旧 Fastify 兼容实现与合同测试
packages/shared/          API/Recipe 共享 Schema
packages/server-core/     AI Provider、Prompt、生成与校验核心
supabase/                 PostgreSQL migration、RLS、Edge Function
deploy/supabase/          Supabase 部署与真实链路验证脚本
docs/                     当前专项说明
00_...md - 21_...md       产品、架构、安全、测试和发布 Blueprint
```

## 开发与验证

环境要求：Node.js 24+、pnpm 11.14.0。

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm typecheck:supabase
pnpm test:supabase
pnpm --filter @ai-kitchen/mobile start
```

Mobile lint 当前受 hoisted ESLint/AJV `defaultMeta` 初始化故障影响，会在规则执行前退出；该失败没有被隐藏或转换为 skip。

## Supabase 部署

配置说明见 [`deploy/supabase/README.md`](./deploy/supabase/README.md)。部署入口：

```powershell
powershell -ExecutionPolicy Bypass -File deploy/supabase/deploy.ps1
```

部署脚本会应用 migration、检查数据库、按需更新百炼 Secret、部署 Edge Function，并执行 Guest → Session → Generate → Recipe → History → Visit 和跨游客隔离验证。

## 文档规则

日常工作只需要优先阅读：

1. [`AI_CONTEXT.md`](./AI_CONTEXT.md)
2. [`DEVELOPMENT_PROTOCOL.md`](./DEVELOPMENT_PROTOCOL.md)
3. [`PROJECT_STATE.md`](./PROJECT_STATE.md)
4. [`CURRENT_STATUS.md`](./CURRENT_STATUS.md)
5. 与任务相关的编号 Blueprint
6. [`DECISIONS.md`](./DECISIONS.md)
7. [`CHANGELOG.md`](./CHANGELOG.md)

编号 Blueprint 保留的原因不是“历史文件舍不得删”，而是其中仍包含 Recipe Schema、食品安全、隐私、幂等、测试和商店发布的验收边界。已完成使命的素材审核、竞品快照、旧 MySQL 说明、重复 ADR 和多 AI 工具指令已经删除。

## 安全边界

- App 不直连数据库或 AI Provider；
- 客户端不能声明可信 owner；
- 模型只产生不可信 Recipe Candidate；
- Food Safety 失败关闭，Nutrition 可结构化降级；
- `requestId` 和 `idempotencyKey` 必须全链路保留；
- Token、数据库密码、AI Key、完整过敏文本和 AI 原始输出不得进入 Git 或普通日志；
- development、staging、production 必须隔离。

真实进度和下一步以 [`CURRENT_STATUS.md`](./CURRENT_STATUS.md) 为准。
