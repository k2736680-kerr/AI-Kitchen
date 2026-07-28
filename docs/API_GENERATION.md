# 版本化菜谱生成 API

## 当前实现状态

- API 契约：已实现，版本 `v1`。
- Edge Function：已实现，入口 `supabase/functions/recipes-generate/index.ts`。
- Shared Zod Schema：已实现，Mobile 与 Edge Function 共用 `packages/shared/src` 源码。
- Mobile Repository：已实现 Local/Remote 两个 Adapter。
- 真实 AI：未调用；通用 HTTP Provider Adapter 已建立，但没有配置 Provider 地址或密钥。
- Supabase 部署：未执行；migration 和 RLS 定义已提交。
- 数据库幂等：代码支持 development memory store；生产使用 migration 对应的 Supabase REST store。

## HTTP 契约

请求：`POST /functions/v1/recipes-generate`

请求头必须包含：

- `Content-Type: application/json`
- `x-request-id`
- `x-idempotency-key`

请求体包含：

```json
{
  "schemaVersion": "v1",
  "requestId": "req_example_123456",
  "idempotencyKey": "idem_example_123456",
  "clientVersion": "1.0.0",
  "identity": { "type": "guest", "guestId": "session-guest-example" },
  "generationRequest": {
    "schemaVersion": "v1",
    "selectedIngredientIds": ["egg", "tomato", "noodles"],
    "customIngredients": [],
    "servings": 2,
    "maxCookingTimeMinutes": 30,
    "availableTools": [],
    "dietaryPreferences": [],
    "allergens": [],
    "excludedIngredients": []
  }
}
```

响应是按 `status` 区分的联合：`success`、`no_match`、`validation_error`、`rate_limited`、`generation_failed`、`timeout`、`service_unavailable`。成功响应包含完整结构化 `recipe` 和 `metadata`：来源、Provider、生成时间、耗时、是否修复、请求版本和 Recipe Schema 版本。

所有输入和输出均使用 strict Zod Schema。未知字段、版本不匹配、非法食材 ID、过敏冲突和忌口冲突不会进入 Provider。

## Provider 与环境

Mobile 配置写在 `apps/mobile/.env`（不要提交真实值）：

```dotenv
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_GENERATION_MODE=local
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_CLIENT_VERSION=1.0.0
EXPO_PUBLIC_API_TIMEOUT_MS=45000
```

- development：默认 local；设置 `EXPO_PUBLIC_GENERATION_MODE=remote` 才调用 API。
- staging/production：固定 remote；没有 API 地址时显示配置错误，不回退本地生成。
- Mobile 只能使用公开 API base URL，不读取 Service Role Key 或 Provider Key。

Edge Function 开发环境变量示例见 `supabase/functions/.env.example`：

```dotenv
APP_ENV=development
GENERATION_PROVIDER=deterministic
GENERATION_IDEMPOTENCY_STORE=memory
GENERATION_PROVIDER_TIMEOUT_MS=30000
```

真实 Provider 使用服务端变量 `GENERATION_PROVIDER=http`、`RECIPE_PROVIDER_URL`、`RECIPE_PROVIDER_REPAIR_URL` 和 `RECIPE_PROVIDER_KEY`。使用 Supabase CLI 时通过 `supabase secrets set` 配置，不写入仓库。staging/production 禁止 deterministic Provider。

## 本地 Edge Function

本机安装 Supabase CLI 后：

```bash
supabase start
supabase db reset
supabase functions serve recipes-generate --env-file supabase/functions/.env.example
```

使用 `GENERATION_IDEMPOTENCY_STORE=memory` 仅表示单进程开发测试；它不提供跨实例幂等。部署环境必须配置 Supabase URL 和 Service Role Key，让内部表由服务端 REST store 访问。

## 幂等、超时和安全边界

- `idempotencyKey` 相同且请求内容相同：成功响应重放。
- 相同 key 对应不同请求：返回 `IDEMPOTENCY_CONFLICT`。
- 正在处理：返回 `IDEMPOTENCY_IN_PROGRESS`，不会启动第二次 Provider 调用。
- Provider 总预算最多 35 秒，修复最多一次且共享同一预算。
- Mobile 最长等待 45 秒；取消或卸载会 Abort，不再导航或更新已卸载页面。
- 过敏原和忌口始终硬过滤；修复后仍冲突则失败关闭。
- 日志只记录 event、requestId、status、Provider 和 repaired，不记录 Token、Prompt、完整 Recipe 或 Provider 原始响应。

## 数据库与 RLS

`supabase/migrations/20260728000000_create_generation_requests.sql` 创建内部幂等请求表，`idempotency_key` 唯一，RLS 开启且没有客户端 policy。当前只接受 guest 请求；guest 的随机 ID 只作为业务身份摘要，不作为可信 owner。anonymous/registered 请求会被拒绝，待接入 Supabase Auth 后再映射 `owner_id`。
