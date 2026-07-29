# API 身份与游客会话（阶段 1）

**状态：** DONE（游客阶段基础）  
**范围：** `apps/api` `/api/v1`、MySQL guest/session 表、Mobile SecureStore bootstrap

## 当前身份

本阶段只支持 `guest`。服务端生成 UUID guest subject；客户端不再生成可信 guestId，也不能通过请求体、查询参数或自定义 Header 改变所有权。registered、anonymous、register、login、refresh 和账号删除仍未实现。

## 会话流程

1. Mobile 从 Expo SecureStore 读取 opaque session token。
2. 有 token 时请求 `GET /api/v1/auth/session` 验证；服务端返回同一个 guest subject。
3. 没有 token 时请求 `POST /api/v1/auth/guest-session`；服务端创建 guest identity 和 session，并只在响应中返回一次原始 token。
4. Mobile 先把 token 写入 SecureStore，再把 guest subject 写入内存 Store。
5. 生成、菜谱详情、History 和 visit 请求统一发送 `Authorization: Bearer <token>`。
6. API 中间件通过 token hash 查询有效 session，向 `request.identity` 注入 `{ type: 'guest', id, sessionId }`。

启动 bootstrap 有单例 Promise 并发控制；Home、History 等页面同时挂载时只会发起一个 bootstrap。无效、过期或 revoked token 返回 `401 AUTH_REQUIRED`，不会静默创建另一个 guest，也不会回退到 Fixture 制造成功。

## API

### `POST /api/v1/auth/guest-session`

无 Authorization 时创建 guest。响应包含 `subject.id`、`session.expiresAt` 和一次性 `session.token`。已有有效 Bearer 时返回原 guest subject 和过期时间，不创建新 guest，也不重新返回原始 token。

### `GET /api/v1/auth/session`

需要有效 Bearer。返回 subject type/id 和 expiresAt，不返回 token、token_hash、数据库内部主键或配置。

### 私有接口

以下接口都需要有效 Bearer，并从服务端 session 推导 guestId：

- `POST /api/v1/recipes/generate`
- `GET /api/v1/recipes/:recipeId`
- `GET /api/v1/history?locale=...`
- `POST /api/v1/history/visit`

GenerationApiRequest、History query 和 visit body 中仍可短期出现 deprecated `guestId` 字段以兼容旧客户端，但 API 完全忽略它；新版 Mobile 不再发送。Recipe detail 和 visit 只允许当前 guest 拥有的动态菜谱，无法证明所有权时统一返回 404。

## Token 安全

- 使用 Node.js `crypto.randomBytes(32)` 生成 base64url opaque token。
- MySQL 只保存 SHA-256 `token_hash`，不保存明文 token。
- token 不进入 URL、日志、错误响应、普通 Store 或 AsyncStorage。
- 默认 session TTL 为 `180` 天，由 `SESSION_TTL_DAYS` 控制，允许范围为 1–730 天。
- 目前没有 refresh/rotation API；正式账号阶段另行设计。

## 旧数据

身份加固前按 raw guestId 写入的 generation request、recipe 和 history 不删除、不修改 recipeId，也不自动认领给新 guest。新会话产生的数据才使用服务端签发的 guestId。旧数据后续只能通过正式认领或管理员迁移方案处理。
