# ADR-0004：用户身份与数据所有权

**状态：** Accepted（仅设计，未实现）
**日期：** 2026-07-29
**范围：** guest、registered、数据归属、访客升级、会话安全、账号能力和“我的”Tab边界

## 背景

AI Kitchen 当前已经有 Mobile remote、Fastify `/api/v1`、MySQL、远程生成菜谱、guest history 和动态菜谱语言链路，但尚无正式注册、登录、会话或账号所有权模型。历史 ADR-0001 曾以 Supabase Auth/PostgreSQL/RLS 描述 `anonymous` 和 `registered`；正式后端已由 ADR-0003/D-016 改为内网 Node.js + Fastify + MySQL，因此本 ADR 取代其中的平台特定实现，只保留服务端验证身份、客户端不得决定 owner、最小化收集和默认拒绝越权的原则。

本轮只做架构审计和设计，不创建用户 migration，不修改现有 API、数据库、Provider、Mobile 业务代码，也不创建登录注册页面。

## 当前 guest 机制审计

- `apps/mobile/src/state/p0-state.ts` 的 `createSessionGuestId()` 在 `P0StoreProvider` 初始化时用时间戳和随机字符串生成 `session-guest:*`。
- guestId 没有通过 AsyncStorage 或 SecureStore 持久化；Store 重建、App 进程重启、卸载或清除数据都可能产生新的 guestId。当前实现更准确地说是“会话 namespace”，不是“首次安装永久身份”。
- Mobile 在 `GenerationApiRequest.identity`、History 查询和 history visit 中传递 guestId。
- API 当前只校验 guestId 是非空字符串：`ai_kitchen_generation_requests.guest_id` 保存它，`ai_kitchen_recipe_history.guest_id` 用它做去重和查询。
- `ai_kitchen_recipes` 当前没有 owner 字段；recipe 读取按 recipeId 查询，知道 recipeId 的调用者不需要证明其创建者身份。
- `recipeCache`、`recentRecipes`、烹饪进度和生成条件在 Mobile Store 中，是当前 App 会话内状态；没有跨启动持久化。
- Local Repository 使用 Fixture；Remote Repository 使用 `/api/v1`；两者都没有正式账号会话。

所以当前数据的真实状态如下：

| 数据 | 当前关联方式 | 当前事实 | 目标所有权 |
| --- | --- | --- | --- |
| generation request | 客户端 guestId | 过渡期 guest 关联，不是可信授权 | guest subject 或 userId |
| AI recipe | recipeId + 快照，无 owner | 过渡期服务端记录；不能宣称安全私有 | guest subject 或 userId |
| recipe history | `(guestId, recipeId)` | 当前会话/guest namespace 维度 | guest subject 或 userId |
| visit count | history 行内计数 | 属于当前 guest namespace + recipe | owner + recipe |
| Fixture/public catalog | 固定目录 | 公共数据 | public |
| recipeCache/recentRecipes | Mobile Store | 当前设备/安装实例会话本地 | 设备本地，登录后可由 user 数据刷新 |

## 决策

### 1. 正式身份状态采用两态

| 状态 | 定义 | 数据能力 |
| --- | --- | --- |
| `guest` | 无账号、无登录凭证；由服务端受控 guest session 关联本地 guest namespace | 体验生成和有限历史；默认可丢失，不承诺跨设备恢复 |
| `registered` | 已验证的正式账号，会话中由服务端解析出 userId | 跨设备恢复账号数据、历史、收藏和已保存偏好 |

不保留 `anonymous` 作为独立产品身份。它与 guest 都表示“没有正式账号”，但 anonymous 会额外制造一个看似可登录、实际没有账号能力的服务端 userId，增加会话恢复、删除和数据迁移分支。未来若为了限流或服务端会话需要匿名 subject，它只能是内部 session 类型，不得作为客户端可声明的 `userId`，也不作为第三种业务所有者。

当前 P0 继续只支持 guest，不直接实现 registered。未来 guest 注册时直接升级到 registered，不经过 anonymous。`packages/shared` 中已有的 anonymous 类型作为历史契约兼容项保留，正式身份实现前不扩展、不接入当前 API。

### 2. 数据所有权

未来服务端 owner 一律来自验证后的 subject，而不是请求体中的 `userId`、`ownerId` 或 raw guestId。

| 数据 | guest 阶段 | registered 阶段 | 规则 |
| --- | --- | --- | --- |
| generation request | guest subject | userId | 生成审计记录随 owner 迁移或删除 |
| AI recipe | guest subject，默认私有 | userId，默认私有 | 升级保持 recipeId；Fixture/public catalog 才是公共数据 |
| recipe history | guest subject | userId | 只能读取和更新自己的 history |
| visit count | guest + recipe | userId + recipe | 不是全局计数；同一 owner/recipe 幂等累加 |
| 收藏 | 不做账号同步，可暂存本地 | userId | P0 不实现，未来必须做 owner 校验 |
| 用户偏好 | 设备本地 guest draft | userId，可有加密/受控本地缓存 | 过敏原、忌口仅在保存功能存在时入账号 |
| 过敏原/忌口 | 当前会话本地条件 | userId，可由用户明确保存 | 不因登录静默上传或共享 |
| 自定义食材 | 当前会话本地 | userId（仅在“保存”功能存在时） | 不写入标准食材目录 |
| 当前烹饪进度 | 设备本地/当前会话 | 默认仍本地；未来可选 userId 同步 | P0 不做云端同步 |
| 语言设置 | 设备本地 | 设备本地，账号可作为未来同步来源 | 本轮不改变现有设置 |
| recipeCache/recentRecipes | 设备本地/当前会话 | 账号数据的本地缓存副本 | 切换身份时按 namespace 清理或重建 |

### 3. guest 注册新账号

用户在 guest 阶段生成菜谱后注册新账号时，采用“明确确认后认领”的策略：

1. 注册并验证成功，创建 registered session；guest session 仍短暂有效。
2. App 请求预览待认领的数据范围和数量，展示给用户并要求确认。
3. 服务端用已验证的 guest proof 与目标 user session 创建幂等 merge operation。
4. 在事务中迁移 generation request、私有 recipe 和 history 的 owner；recipeId 保持不变，visit count 保留，首次/最近访问时间取合并后的明确规则。
5. 通过 `ai_kitchen_identity_merges` 记录源、目标、操作状态和幂等键；成功后 guest subject 标记已认领，重复请求返回同一结果。

冲突时以 user 账户已有记录为主，按稳定 recipeId 去重；不得静默覆盖已有账号数据。迁移失败回滚事务并保留可重试状态；guest proof 失效或无法证明来源时拒绝认领，不能仅靠 raw guestId 强行转移。

### 4. guest 登录已有账号

不自动合并。用户必须在登录后选择：

- “只使用已有账号”：切换到账号 namespace；guest 数据留在原 guest session 直到过期。
- “合并本设备 guest 数据”：先展示预览，再按注册场景的幂等事务规则合并。

合并以 user 账号数据为冲突主记录，recipeId 不变，重复 history 合并 visit count 和访问时间，任何失败均可重试且不产生半套结果。

### 5. 退出登录

- 服务端撤销当前 session/refresh token；客户端删除认证凭据和账号缓存。
- 创建新的 guest namespace，避免退出后继续显示账号 History、收藏或偏好。
- `recipeCache`、`recentRecipes`、账号敏感草稿和 merge 临时数据按身份清理；公共 Fixture 可继续显示。
- 服务端 registered 数据不因退出登录删除；用户下次登录可恢复。

### 6. 删除账号

删除请求需要已验证的 registered session，并执行幂等的延迟/事务化删除流程：撤销 sessions，删除账号资料、认证映射、账号偏好、过敏原、忌口、收藏、私有生成菜谱、generation requests 和 history；与账号无关的 Fixture/public catalog 保留。若未来允许匿名化保留统计或公共菜谱，必须在单独 ADR 和隐私政策中明确，不在本轮默认保留个人生成数据。

删除完成后清理本地账号缓存、guest merge 临时数据、recipeCache/recentRecipes 和敏感草稿，回到新的 guest。删除在当前设计中不可承诺可恢复；正式实现前必须定义确认、冷静期、备份清理和失败重试，不得只做客户端删除。

## 安全边界

- guestId 不是正式安全凭证；不能单独换取账号、修改 owner 或读取他人数据。
- registered 的 userId 只能由服务端从验证后的 session/token 推导，客户端请求体中的 userId/ownerId 只可作为被拒绝或忽略的输入，不能作为授权依据。
- History、recipe 私有读取、visit、收藏、偏好和合并接口都必须按当前服务端 subject 做 owner 校验；不能只按可猜测的 recipeId 或 query guestId 授权。
- guest 认领必须同时证明 guest session、目标 registered session 和一次性/幂等操作；防止重放、跨用户认领和越权合并。
- 不保存明文密码；Token、密码、API key、完整隐私数据、完整模型输出和完整菜谱不得进入普通日志。具体密码哈希和 Token 库留到实现阶段按现有运行约束选定，不自行设计加密算法。
- 错误只返回普通用户可理解的稳定错误码和消息；不泄露账号是否存在、数据库结构、内部凭据或堆栈。

## 数据库演进建议（本轮不创建 migration）

| 表 | 用途与主键 | 重要唯一约束 | 关系与是否需要 |
| --- | --- | --- | --- |
| `ai_kitchen_users` | 正式用户资料；`user_id` UUID 主键 | 可选规范化 email 唯一；状态索引 | 被 auth identities、sessions、业务 owner 引用；P0 阶段 1 创建 |
| `ai_kitchen_auth_identities` | 登录方式映射；`auth_identity_id` 主键 | `(provider, provider_subject)` 唯一；email 规范化规则单独约束 | 多对一 users；P0 仅邮箱密码也建议创建，便于后续扩展 |
| `ai_kitchen_sessions` | refresh/session 撤销与过期；`session_id` 主键 | `session_token_hash` 唯一 | 多对一 users；只存 hash，不存明文 token；P0 阶段 1 创建 |
| `ai_kitchen_guest_identities` | 服务端受控 guest proof 与状态；`guest_identity_id` 主键 | `guest_namespace` 唯一 | 可与现有 guest_id 记录映射；P0 阶段 1 创建，替代直接信任 raw guestId |
| `ai_kitchen_identity_merges` | 认领/合并审计和幂等状态；`merge_id` 主键 | `(source_guest, target_user, idempotency_key)` 唯一 | 关联 guest、users 和迁移结果；P0 阶段 3 创建 |

现有 `ai_kitchen_generation_requests`、`ai_kitchen_recipes`、`ai_kitchen_recipe_history` 后续增加受约束的 owner 列（guest identity 或 userId 的明确关系），并补齐 owner-scoped 索引/唯一约束和迁移回滚方案。不要通过一个同时含字符串 guestId/userId 的模糊字段绕过关系约束。P0 本轮不创建任何用户表或 owner migration。

## API 演进建议（本轮不实现）

建议保持现有 `/api/v1` REST 和错误风格，身份从 Authorization Bearer session 解析，guest 使用受控 guest session：

| API | 阶段 | 目的 |
| --- | --- | --- |
| `POST /api/v1/auth/register` | 2 | 邮箱注册并创建 registered session |
| `POST /api/v1/auth/login` | 2 | 邮箱登录 |
| `POST /api/v1/auth/logout` | 2 | 撤销当前 session |
| `POST /api/v1/auth/refresh` | 2 | 轮换 refresh/session 凭据 |
| `GET /api/v1/me` | 2 | 返回当前已验证用户的非敏感资料 |
| `DELETE /api/v1/me` | 5 | 启动或确认账号删除 |
| `POST /api/v1/identity/guest/claim-preview` | 3 | 返回待认领 guest 数据摘要 |
| `POST /api/v1/identity/guest/claim` | 3 | 用户确认后幂等认领/合并 |

P0 不新增这些 API。现有生成、recipe、history API 在正式身份上线前应先加服务端 subject resolver 和 owner 校验，再扩展请求响应，不让 Mobile 自行声明 owner。

## “我的”Tab 信息架构（只设计，不实现）

未登录/guest：游客状态、登录/注册入口、语言、服务条款、隐私政策、关于 AI Kitchen、App 版本。

已登录：用户基础信息、已存在功能对应的“我的菜谱/收藏”入口、语言、服务条款、隐私政策、关于、退出登录、注销账号入口。

不加入会员、支付、积分、社区、消息中心、云同步开关或第三方账号绑定入口；没有实际功能时不显示“我的菜谱/收藏”。

## 服务条款与隐私政策边界

服务条款页面只定义服务使用规则、生成内容的使用边界、账号责任、可用性和终止规则；隐私政策页面定义收集的账号、设备、生成请求、菜谱历史和安全条件、用途、保存期限、第三方 Provider 处理、删除和用户权利。两者不能用一段占位文案替代，也不能宣称模型或食品安全达到绝对保证。本轮只锁定信息架构和内容责任，不创建页面或法律文本。

## 登录能力范围

- **P0：** 保留游客直接使用，不实现登录。
- **首个 registered MVP：** 邮箱 + 密码，并要求邮箱验证、忘记密码/重置和会话撤销；这是当前内网 API 最小可审计路径。
- **后续：** 邮箱验证码、Apple、Google 等按平台和合规需求逐项增加，并复用 auth identity 映射。
- **当前不做：** 手机号验证码、Apple、Google 和一次性实现全部登录方式；它们会引入短信/第三方凭据、审核、恢复和隐私成本，不能在身份所有权尚未落地时提前扩展。

## 分阶段实施计划

### 阶段 1：身份数据库与服务端会话基础

- 输入：本 ADR、现有 guest 数据、环境和 Secret 约束。
- 输出：users/auth identities/sessions/guest identities 表、服务端 subject resolver、session revoke、现有业务表 owner 迁移设计。
- 验收：服务端可区分 guest/registered；客户端不能伪造 userId；跨用户读取和修改、过期和撤销会话测试失败关闭。
- 不包含：注册 UI、第三方登录、guest 合并、“我的”Tab。

### 阶段 2：注册、登录、退出和当前用户接口

- 输入：阶段 1 的会话和密码策略。
- 输出：邮箱注册/登录/退出/刷新、`GET /me`、稳定错误契约和审计日志。
- 验收：凭据不进日志；刷新轮换、撤销、过期、重复注册和错误登录行为可验证。
- 不包含：自动迁移 guest、第三方登录、账号删除页面。

### 阶段 3：访客数据认领与合并

- 输入：已验证 registered session、guest claim proof、merge 状态表。
- 输出：预览、用户确认、幂等事务合并、冲突去重、失败回滚和审计记录。
- 验收：recipeId 保持、history visit 合并、重复请求不重复转移、跨用户认领被拒绝。
- 不包含：静默自动合并、公共菜谱改私有、跨账号任意转移。

### 阶段 4：Mobile “我的”Tab和登录注册页面

- 输入：已稳定的 auth API、session 生命周期和 claim UX。
- 输出：guest/registered 信息架构、登录/注册/退出、缓存 namespace 切换。
- 验收：状态恢复、退出隔离、错误提示和语言切换不泄露账号数据。
- 不包含：服务条款/隐私法律文本、支付、社区、同步开关。

### 阶段 5：服务条款、隐私政策、账号删除

- 输入：法律审阅后的文本、保存期限和删除策略。
- 输出：条款/隐私页面、版本确认、账号删除确认和服务端删除流程。
- 验收：新用户可看到当前版本；删除覆盖服务端个人数据和本地缓存，失败可重试并有审计。
- 不包含：不可恢复性承诺之外的复杂数据导出，除非另有产品决策。

### 阶段 6：App 图标、启动屏和首次使用引导

- 输入：品牌资产和阶段 4/5 的首次使用流程。
- 输出：图标、启动屏、游客说明和权限/隐私引导。
- 验收：冷启动、升级、跳过和语言切换行为正确。
- 不包含：本轮设计之外的营销动画、会员或第三方账号绑定。

## 被拒绝的方案

- 继续使用 Supabase Auth/RLS 作为正式运行时：与 D-016 的内网 Fastify + MySQL 决策冲突。
- 让 raw guestId、设备 ID、邮箱或客户端 userId 直接充当 owner：无法证明身份，容易越权。
- 保留 anonymous 作为必须经过的第三种用户：与 guest 职责重复，增加升级、退出和删除复杂度。
- guest 注册后静默覆盖已有账号数据：不可解释、不可回滚，也可能造成数据越权。
- 在本轮创建固定 Token、伪用户或登录页面：会把未验证的安全边界伪装成已完成能力。

## 风险与回滚

- 风险：现有 guest rows 没有可信 owner；正式身份上线前不得把 raw guestId 当作安全数据边界。
- 风险：guest session 丢失会导致无法认领本地数据；产品必须明确未注册数据可能丢失。
- 风险：合并会涉及 recipe/history 唯一约束和外键；实现前必须做事务、失败恢复和备份演练。
- 本轮回滚只需回退 ADR、决策索引、状态和变更记录，不涉及数据库或运行环境。未来身份 migration 必须有 down/恢复演练，不能以回滚文档代替数据备份。
