# 菜谱生成 API

## 当前实现

- 正式运行平台：Supabase anonymous Auth、PostgreSQL/RLS、`supabase/functions/api` Edge Function。
- 生产 Base URL：`https://dthfeeafcecfmxghjnbo.supabase.co/functions/v1/api`。
- AI Provider：阿里云百炼 OpenAI 兼容接口，默认模型 `qwen3.7-plus`。
- Shared Zod 契约、Server Core、Mobile Remote Repository、请求取消和 Session Refresh 已实现。
- 旧 `apps/api` 只保留为兼容实现与合同测试，不存在旧服务器部署路径。

## REST 路径

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/v1/health` | 数据库和 Provider 状态 |
| POST | `/api/v1/auth/guest-session` | 创建 Supabase anonymous session |
| GET | `/api/v1/auth/session` | 验证当前 session |
| POST | `/api/v1/recipes/generate` | 生成并保存 1–5 个已校验菜谱 |
| GET | `/api/v1/recipes/:recipeId` | 读取当前 owner 的菜谱 |
| GET | `/api/v1/history?locale=&limit=&cursor=` | 当前 owner 的最近菜谱 |
| POST | `/api/v1/history/visit` | 记录当前 owner 的访问 |

除 Health 和 Guest Session 外，所有路由都要求 Bearer JWT。owner 始终由验证后的 `auth.uid()` 推导；请求体中的 guestId/userId/ownerId 不能用于授权。

## 生成与幂等

生成请求使用 `GenerationApiRequest`：`schemaVersion`、`requestId`、`idempotencyKey`、`clientVersion`、`identity` 和 `generationRequest`。

- `locale` 参与稳定 request hash；
- 相同 idempotency key + 相同 hash 重放同一结果；
- 相同 key + 不同 hash 返回 `idempotency_conflict`；
- 处理中请求不会启动第二次 Provider 调用；
- 响应使用严格判别联合：`success`、`no_match`、`validation_error`、`rate_limited`、`generation_failed`、`timeout`、`service_unavailable`、`idempotency_conflict`。

## 安全流水线

1. Zod 请求校验；
2. 食材、过敏原、忌口、厨具和业务约束；
3. 持久限流和幂等预留；
4. Provider 生成不可信 Recipe Candidate；
5. JSON/Recipe Schema、语言、时间、厨具、偏好和 Food Safety 校验；
6. 必要时执行受限 repair，仍失败则失败关闭；
7. 事务保存 Final Recipe snapshot 和 history。

Prompt、Authorization、JWT、模型原始输出、完整过敏文本和 DashScope Key 不进入普通日志或业务表。

## 配置与部署

Mobile 只保存公开配置：

```dotenv
EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL=https://dthfeeafcecfmxghjnbo.supabase.co/functions/v1/api
EXPO_PUBLIC_GENERATION_MODE=remote
```

部署配置和命令见 [`deploy/supabase/README.md`](../deploy/supabase/README.md)。`DASHSCOPE_API_KEY` 只在首次创建或轮换时上传为 Function Secret；重复部署留空会保留远程已有 Secret。

## 验证

正式门禁包括：

- migration、DB lint、RLS 和受控 RPC；
- Edge 类型检查与合同测试；
- Guest → Session → Refresh → Generate → Recipe → History → Visit；
- 跨游客读取阻断；
- 有效 JWT 直连业务表阻断；
- Mobile HTTPS 配置和 Android ARM64 真机链路。

远程数据库、Function 和越权验证已通过；ARM64 真机安装仍待完成。
