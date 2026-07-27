# ADR-0002：Development 环境与 Secret 边界

**状态：** Accepted for planning; implementation not started  
**日期：** 2026-07-27  
**范围：** development/staging/production 环境隔离与客户端/服务端变量边界

## 背景

AI Kitchen 后续会使用 Supabase Auth、PostgreSQL/RLS 与 Edge Functions，但当前尚未创建任何 Supabase Project，也没有真实 URL、Key 或 Secret。本 ADR 只建立命名、隔离和泄漏防护边界，不代表 Supabase 已接入。

## 决策

### 1. 环境隔离

未来至少区分 `development`、`staging`、`production`，每个环境使用独立 Supabase Project、数据库、Auth 用户、Secret、部署配置与日志标识。不得跨环境复用数据库或 Secret；development 不保存 production 用户数据；staging 不使用 production Auth 用户。

本轮只准备 development 的变量模板，不创建 development、staging 或 production Project。

### 2. 客户端公开变量

`apps/mobile/.env.example` 只列出允许进入 Expo Bundle 的公开占位变量：

```dotenv
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_APP_ENV=development
```

Publishable Key 对应 Supabase 新版客户端公开 Key；若目标账户只有旧版 Anon Key，正式接入前单独决定兼容方案，不同时创建含义重复的变量。

公开不等于可信：Publishable/Anon Key 不是管理员密钥，权限必须依赖 JWT、API 授权和 RLS；客户端不得具备绕过 RLS 的能力。

### 3. 服务端私密变量

以下变量未来只能存在于受控服务端 Secret 管理：

```text
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
JWT signing secrets
AI provider keys
guest-session signing secret
第三方私密凭据
```

它们绝不能进入 `EXPO_PUBLIC_*`、`apps/mobile/.env*`、`app.json`、移动端源码、Git、日志、客户端错误信息、构建产物或测试截图。Secret/Service Role Key 泄漏后必须轮换，不能只删除文件。

### 4. 本地开发

开发者未来从 `.env.example` 复制 `.env.local`，只连接 development。`.env.local` 永远不提交；不得通过聊天、截图、日志或 PowerShell 历史传播 Secret。当前不创建 `.env.local` 或任何真实环境文件。

### 5. CI/CD

CI Secret 按 development/staging/production 分离，只注入所需 Job，不输出变量值，不把 `.env` 打包为构建产物。Production Secret 不用于普通 Pull Request 检查；服务端 Secret 与 Expo 客户端公开变量分开管理。

### 6. App 与 API 边界

App 未来可使用 Supabase 公开客户端 Key 完成 Auth；普通业务数据默认通过版本化自有 API。普通用户数据操作使用调用者 JWT 和 RLS-scoped client；Secret/Service Role client 仅用于受控服务端管理操作。本轮没有实现 Supabase Client、API、Auth 或数据库。

## 未决事项

以下事项保持未决定：

1. Development Supabase Project 的 Region；
2. 目标账户是否可用新版 Publishable/Secret Key；
3. 是否使用本地 Supabase CLI；
4. API 托管在 Edge Functions 还是其他服务；
5. Development Project 的创建责任人与管理员；
6. Secret 轮换周期；
7. CI/CD 平台；
8. Staging 和 Production 的创建时间。

## 本轮边界与验收

本轮只新增公开变量模板、忽略规则和本 ADR。不创建 Supabase Project，不登录 Supabase，不安装 Supabase 包或 CLI，不创建 SQL/迁移，不实现 Auth，不修改 App 源码。验收包括 frozen-lockfile、typecheck、lint、Git diff、忽略规则和 Secret 样式扫描。

## 回滚

删除本 ADR、`.env.example` 及本轮新增的 mobile 忽略规则即可回滚；不涉及运行资源、数据库、Secret 或依赖锁文件。
