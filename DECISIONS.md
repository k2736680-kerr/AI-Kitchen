# Architecture & Product Decisions

> 本文件采用轻量 ADR（Architecture Decision Record）形式记录影响长期架构、数据、产品边界和安全的决策。新决策追加，不覆盖历史。被替代的决策标记 `Superseded` 并链接新决策。

## 决策状态

- `Proposed`：提议中；
- `Accepted`：已接受并作为基线；
- `Rejected`：已拒绝；
- `Deprecated`：不再推荐但仍可能存在；
- `Superseded`：已被新决策替代。

---

## 决策索引

| ID | 标题 | 状态 | 日期 |
|---|---|---|---|
| D-001 | 移动端采用 React Native + Expo + TypeScript | Accepted | 2026-07-24 |
| D-002 | Android 优先，稳定后扩展 iOS | Accepted | 2026-07-24 |
| D-003 | App 不直接调用 AI Provider | Accepted | 2026-07-24 |
| D-004 | P0–P2 使用 Supabase Edge Functions | Superseded by D-016 | 2026-07-24 |
| D-005 | PostgreSQL + RLS 作为主数据系统 | Superseded by D-016 | 2026-07-24 |
| D-006 | 使用 Monorepo 和共享 Schema | Accepted | 2026-07-24 |
| D-007 | AI 输出采用四层校验 | Accepted | 2026-07-24 |
| D-008 | 食品安全采用失败关闭 | Accepted | 2026-07-24 |
| D-009 | 标准食材 ID 与别名分离 | Accepted | 2026-07-24 |
| D-010 | guest → anonymous → registered 身份路径 | Superseded by D-027 | 2026-07-24 |
| D-011 | 单菜同步生成，长任务未来异步 | Accepted | 2026-07-24 |
| D-012 | development/staging/production 完全隔离 | Accepted | 2026-07-24 |
| D-013 | requestId + idempotencyKey 全链路使用 | Accepted | 2026-07-24 |
| D-014 | 关系规范化与 Recipe Snapshot 并存 | Accepted | 2026-07-24 |
| D-015 | P0/P1 实施严格范围控制 | Accepted | 2026-07-24 |
| D-016 | 正式后端使用内网 Node.js + MySQL | Accepted | 2026-07-28 |
| D-017 | 动态菜谱按请求语言保存与检索 | Accepted | 2026-07-29 |
| D-027 | 用户身份与数据所有权采用 guest/registered 两态 | Accepted | 2026-07-29 |

---

## D-001：移动端采用 React Native + Expo + TypeScript

**状态：** Accepted
**日期：** 2026-07-24

### 背景

项目需要 Android 和 iOS，主要由非专业开发者与 AI 编程工具协作。需要降低双端重复开发、构建和原生配置成本，同时保持后续接入通知、安全存储和商店构建的能力。

### 备选

1. Flutter；
2. 原生 Kotlin + Swift；
3. React Native 不使用 Expo；
4. React Native + Expo + TypeScript。

### 决策

采用 React Native + Expo + TypeScript。导航优先使用 Expo Router；涉及原生能力后使用 Development Build 和 EAS Build，不长期依赖 Expo Go。

### 原因

- 跨平台；
- TypeScript 可与后端和共享 Schema 复用；
- AI 工具对生态支持较好；
- Expo 降低初期原生配置和构建门槛；
- 可逐步增加原生能力。

### 后果

- 依赖 Expo SDK 的升级节奏；
- 原生库兼容性必须提前验证；
- 需要严格区分 Expo Go、Development Build 和生产构建。

### 重新评估触发

出现无法通过 Expo/React Native 实现的核心能力，且替代方案经过技术验证和迁移评估。

---

## D-002：Android 优先，稳定后扩展 iOS

**状态：** Accepted
**日期：** 2026-07-24

### 背景

同时完成双平台会增加设备、签名、审核和原生兼容成本。项目需要先证明核心体验。

### 决策

P0 以 Android 模拟器和一台真机作为退出条件；P1 继续 Android 内测；P2 完成 Android 发布门禁并同步处理 iOS 兼容，稳定后提交 iOS。

### 后果

- UI 和领域代码仍需保持跨平台；
- 禁止写死 Android-only 业务逻辑；
- iOS 特有权限和构建在后期集中验证。

---

## D-003：App 不直接调用 AI Provider

**状态：** Accepted
**日期：** 2026-07-24

### 背景

移动端包无法安全保存 AI Key，也无法可靠执行限流、预算、Prompt 保护、输出校验和供应商切换。

### 决策

App 只调用项目自有后端。AI Provider Key 仅存在服务端 Secrets。所有输入和输出在服务端校验。

### 后果

- 必须维护后端；
- 离线不能新生成；
- 可统一成本、规则、日志和模型切换；
- 客户端不能绕过安全流程。

### 禁止例外

不得为了“快速原型”将真实生产 Key 放入 App。需要本地演示时使用服务端开发环境或 Mock。

---

## D-004：P0–P2 使用 Supabase Edge Functions

**状态：** Superseded by D-016
**日期：** 2026-07-24

### 背景

首版团队小、请求量有限，需要快速获得 Auth、PostgreSQL、RLS、Functions 和 Secrets。

### 备选

- 独立 Node 服务；
- Firebase Functions/Firestore；
- Serverless 平台 + 独立数据库；
- Supabase Edge Functions。

### 决策

P0–P2 使用 Supabase Edge Functions 作为 API 和生成编排入口。业务逻辑保持模块化，避免与平台 SDK 深度耦合。

### 后果

- 部署和身份集成简单；
- 需关注 Edge Runtime 兼容性和执行时限；
- 长任务未来可能迁移到异步 Worker；
- Provider SDK 必须验证运行环境支持。

### 重新评估触发

同步生成无法满足执行时间、区域、吞吐、队列或供应商 SDK 要求。

---

## D-005：PostgreSQL + RLS 作为主数据系统

**状态：** Superseded by D-016
**日期：** 2026-07-24

### 背景

用户、偏好、标准食材、菜谱、步骤、收藏、规则和反馈之间关系明确，需要事务、约束、索引和权限。

### 决策

使用 Supabase PostgreSQL。所有用户数据关联 `auth.users.id`，启用 Row Level Security，默认拒绝并开放最小权限。

### 为什么不以 MongoDB/Firebase JSON 为主

- 关系、唯一约束和多表一致性较多；
- RLS 与 Auth 集成适合用户所有权；
- 生成状态机和幂等需要事务及唯一索引；
- 食材、别名、过敏和营养需要可查询的规范化结构；
- 大量 JSON 会削弱约束和后续分析。

### 后果

- 必须设计迁移和索引；
- RLS 需要专项测试；
- 允许在合适位置保存 JSON 快照，但不能替代核心关系模型。

---

## D-006：使用 Monorepo 和共享 Schema

**状态：** Accepted
**日期：** 2026-07-24

### 背景

App、Edge Function、测试和 AI 输出必须对同一字段达成一致。多个仓库或复制类型会导致漂移。

### 决策

采用 Monorepo。`packages/shared` 保存 Zod Schema、错误码和跨端类型，`packages/domain` 保存纯领域规则。

### 后果

- 契约变更可原子提交；
- 构建需要处理工作区依赖；
- Shared 包不得依赖 React Native 或服务端平台；
- 破坏性字段变化必须版本化。

---

## D-007：AI 输出采用四层校验

**状态：** Accepted
**日期：** 2026-07-24

### 决策

AI 候选输出依次经过：

1. JSON/语法解析；
2. 共享 Schema 校验；
3. 业务规则校验；
4. 食品安全规则校验。

营养处理在安全通过后执行。

### 原因

- JSON 正确不代表业务合理；
- Schema 正确不代表不存在过敏或危险；
- Prompt 无法提供确定性保证；
- 分层错误更容易诊断和测试。

### 后果

- 需要维护规则和测试；
- 可能阻断部分看似可用的结果；
- 质量指标可按层统计。

---

## D-008：食品安全采用失败关闭

**状态：** Accepted
**日期：** 2026-07-24

### 背景

若安全规则服务异常仍展示未校验结果，用户无法知道风险。

### 决策

安全规则异常时不展示候选菜谱，返回统一错误或阻断状态。营养异常不采用同样策略，可标记不可用后返回安全菜谱。

### 后果

- 安全服务可用性成为生成链路关键依赖；
- 必须监控和准备规则版本回滚；
- 用户偶尔会遇到无法生成，但不会获得未校验结果。

---

## D-009：标准食材 ID 与别名分离

**状态：** Accepted
**日期：** 2026-07-24

### 背景

同一种食材可能有多种名称，不同食材也可能在口语中混用。营养、过敏、多语言和统计不能依赖自由文本。

### 决策

建立 `ingredients` 标准实体和 `ingredient_aliases`。保留用户原显示名，同时记录标准 ID、匹配方式和置信度。

### 后果

- 需要初始标准数据和维护流程；
- 自定义食材可以存在，但营养和安全置信度受限；
- 多语言扩展不改变标准 ID。

---

## D-010：guest → anonymous → registered 身份路径

**状态：** Accepted
**日期：** 2026-07-24

### 背景

强制注册会降低首次体验；完全本地又无法云同步和执行用户级限流。

### 决策

P0 允许 guest 本地体验；P1 使用 Supabase anonymous 建立云端所有权；P2 支持绑定正式登录。优先保持同一 auth user ID。

### 后果

- 需要本地到云端迁移；
- 迁移必须幂等并保留回滚快照；
- 切换账号必须隔离本地缓存；
- 账户删除范围更复杂。

---

## D-011：单菜同步生成，长任务未来异步

**状态：** Accepted
**日期：** 2026-07-24

### 背景

单道菜同步交互简单，但周菜单、批量生成和图片可能超过请求时限。

### 决策

P0/P1 单菜生成使用同步 API。App 等待上限建议 45 秒，模型单次超时 30–35 秒。长任务未来使用 `jobId` 异步状态机。

### 后果

- 首版实现简单；
- 需要请求恢复和超时体验；
- 不能在同步接口中无限增加任务范围。

---

## D-012：development/staging/production 完全隔离

**状态：** Accepted
**日期：** 2026-07-24

### 决策

三个环境使用隔离的数据、Auth 用户、Secrets、AI 预算、监控和构建配置。生产数据不得复制到开发环境。

### 后果

- 维护成本增加；
- 大幅降低测试误操作和密钥泄漏；
- 发布前必须在 staging 验证迁移和主要流程。

---

## D-013：requestId + idempotencyKey 全链路使用

**状态：** Accepted
**日期：** 2026-07-24

### 背景

生成耗时且计费，网络重试和重复点击可能产生重复请求；用户反馈需要定位具体结果。

### 决策

每次生成包含 `requestId` 和 `idempotencyKey`。幂等 Key 建立数据库唯一约束；requestId 贯穿 App、API、数据库、模型、规则和反馈。

### 后果

- 可防止重复计费；
- 可恢复请求状态；
- 日志和数据模型需要统一字段；
- Key 生命周期和作用域需在 API/数据库专项明确。

---

## D-014：关系规范化与 Recipe Snapshot 并存

**状态：** Accepted
**日期：** 2026-07-24

### 背景

全部拆表有利于查询但历史展示可能受后续 Schema 改变；全部 JSON 便于保存但不利于约束、筛选和分析。

### 决策

菜谱核心字段、食材和步骤规范化保存，同时保存版本化完整 Recipe Snapshot。原始模型响应不等同于 Snapshot，且只在必要时短期脱敏保留。

### 后果

- 存在一定数据冗余；
- 写入必须保证关系数据和快照一致；
- 历史可还原；
- 查询和统计仍可使用规范化表。

---

## D-015：P0/P1 实施严格范围控制

**状态：** Accepted
**日期：** 2026-07-24

### 背景

拍照、周菜单、购物清单、语音、会员等功能容易在核心流程未稳定时造成范围膨胀。

### 决策

功能池中的能力不得插入 P0/P1，除非：

1. 明确移除一个等量功能；
2. 评估数据、权限、安全、成本和周期；
3. 在本文件新增或更新决策；
4. 更新 PRD、总计划和状态。

### 后果

- 核心版本更可控；
- 部分有吸引力的功能延后；
- 产品需求变化有明确成本。

---

## D-016：API 采用版本化 REST，并允许生成状态恢复

**状态：** Accepted
**日期：** 2026-07-27

### 决策

移动端只调用版本化 REST/JSON API。单菜生成保持同步体验，但每次请求都创建可查询的 generation request；客户端超时后通过 requestId 恢复，而不是立即创建新生成。

### 后果

- API、状态机和错误契约清晰；
- 需要 request 状态查询和幂等存储；
- 长任务未来可扩展异步 Job，而不破坏首版接口。

---

## D-017：所有权只能来自服务端验证的 Subject

**状态：** Superseded by D-027
**日期：** 2026-07-27

### 决策

客户端不得通过 Body 中的 ownerId 决定数据所有权。Guest 使用受控 guest subject，anonymous/registered 使用 Supabase auth.uid()；应用授权与数据库 RLS 双层验证。

### 后果

- 需要 guest token、Auth 会话和缓存命名空间；
- 大幅降低用户 A/B 越权和账号串数据风险；
- 测试必须包含 RLS 和 API 越权场景。

---

## D-018：Provider Candidate 与可信 Final Recipe 分离

**状态：** Accepted
**日期：** 2026-07-27

### 决策

模型只输出不含 ID、所有权、安全状态、可信营养来源和时间戳的 Recipe Candidate。服务端完成标准化、业务规则、食品安全、营养和最终 Schema 后，才组装 Final Recipe。

### 后果

- 模型无法伪造可信字段；
- 需要 Candidate Schema、Final Schema 和 Mapper；
- 结构成功率与正式发布成功率可以分层统计。

---

## D-019：Prompt 作为版本化工程资产管理

**状态：** Accepted
**日期：** 2026-07-27

### 决策

Prompt 进入 Git 和 Registry，拥有独立版本、评估、灰度和回滚。用户输入作为结构化数据，Provider Overlay 只处理格式差异，不改变产品语义。

### 后果

- 禁止生产控制台无记录热改；
- 每次 Prompt 变更必须跑固定评估并记录 Token、成本和时长；
- Prompt 不能替代 Schema、Business Rule 或 Food Safety Rule。

---


---

## D-020：使用集中式确定性 Rule Engine

**状态：** Accepted
**日期：** 2026-07-27

### 决策

业务、食品安全和营养前置规则通过版本化 Rule Engine 编排，输出结构化 findings。规则不得散落为 UI、Prompt、SQL 和 Edge Function 中互不一致的条件。

### 后果

规则可测试、回放、审计和撤回；需要 Registry、版本、事实模型和发布流程。Food Safety 域不可用时失败关闭。

---

## D-021：客户端状态和存储按权威来源分离

**状态：** Accepted
**日期：** 2026-07-27

### 决策

服务端状态由 Query layer 管理，持久本地数据由 Local DB 管理，Token 由 SecureStore 管理，短期跨页面 UI 使用轻量 Store，组件状态保留在组件。

### 后果

减少全局 Store 混乱；需要 namespace、hydration、migration、sync queue 和并发测试。

---

## D-022：移动端采用薄路由和 Feature/Use Case/Domain/Repository 分层

**状态：** Accepted
**日期：** 2026-07-27

### 决策

Expo Router 文件只负责路由入口；业务逻辑进入 Feature/Application/Domain，HTTP、Local DB 和 Expo 能力通过 Repository/Adapter 使用。

### 后果

增加初期结构，但提高测试和跨平台维护能力；禁止页面直接 fetch、SQL、SecureStore 或 Supabase。

---

## D-023：原生能力使用 Expo Development Build、Config Plugin 和 EAS

**状态：** Accepted
**日期：** 2026-07-27

### 决策

Expo Go 只用于早期纯 JS 原型。引入真实原生依赖后使用 Development Build；配置优先通过 app config/Config Plugin；构建与分发使用 EAS。

### 后果

正式环境更接近生产；需要管理 build profiles、签名、runtimeVersion、OTA 和 SDK 升级。

---

## D-024：可观测性采用结构化、最小化和版本关联

**状态：** Accepted
**日期：** 2026-07-27

### 决策

requestId 贯穿 App/API/AI/规则/营养。日志使用稳定 event/code 和版本，不默认记录完整 Recipe、AI 输出、过敏自由文本、邮箱或 Token。

### 后果

诊断依赖良好的结构化事件和 redaction；降低第三方监控中的隐私风险。

---

## D-025：发布以版本组合和 Release Manifest 管理

**状态：** Accepted
**日期：** 2026-07-27

### 决策

每次发布记录 App、build、runtime、API、DB migration、Recipe Schema、Prompt、Rule 和 Nutrition 版本。生产采用 staging、灰度、监控和对象级回滚。

### 后果

发布复杂度增加，但可以定位跨组件回归并安全回滚。

---

## D-026：AI 工具规则提供上下文，工程门禁提供强制

**状态：** Accepted
**日期：** 2026-07-27

### 决策

Cursor rules、`CLAUDE.md`、`AGENTS.md` 和 ChatGPT Project instructions 用于持续上下文；真正不可绕过的限制仍通过权限、hooks/CI、RLS、Schema、测试和发布审批实现。

### 后果

需要维护多工具入口但避免把安全寄托于模型遵从；根文档保持同一事实来源，工具文件只做精简适配。

## D-016：正式后端使用内网 Node.js + MySQL

**状态：** Accepted
**日期：** 2026-07-28

### 背景

用户已拥有内网服务器与 MySQL，Supabase Edge Functions 和 PostgreSQL 不再是正式运行平台。既有共享契约、App 不直连模型、幂等、结构化校验和食品安全失败关闭边界仍须保持。

### 决策

正式后端使用 monorepo `apps/api`：Node.js、TypeScript、Fastify、Zod、`mysql2/promise` 与原生 SQL migration；模型固定通过阿里云百炼 OpenAI 兼容接口调用默认 `qwen3.7-plus`。Mobile 只访问 `/api/v1`，不保存阿里云或 MySQL 凭据。

### 后果

- D-004、D-005 被本决策替代；Supabase runtime 与 PostgreSQL migration 从实现中移除。
- MySQL 保存已校验 recipe snapshot、生成幂等记录和过渡期 guest 历史；guestId 不构成可信认证。
- 后续 anonymous/registered 身份、权限与数据所有权需基于内网 API 的可信身份机制重新设计，不可依赖 Supabase Auth/RLS 假设。

### 重新评估触发

内网部署、MySQL 运维或同步生成能力无法满足可靠性、隔离或成本要求时，必须新增 ADR 后才能更换平台。

---

## D-017：动态菜谱按请求语言保存与检索

**状态：** Accepted
**日期：** 2026-07-29

### 背景

静态 UI 和标准食材已支持中文、英文，但远程 Provider 生成的菜谱正文、幂等语义和历史列表没有语言元数据，容易让英文界面混入中文菜谱或重放另一语言结果。

### 决策

保持 `GenerationRequest v1`，新增受限 `locale`（`zh-CN`、`en-US`）。Mobile 每次生成显式提交当前语言；服务端将请求 locale 纳入 request hash、约束 Provider Prompt、执行轻量语言一致性校验，并在校验后写入 `recipe.locale`。History 以 recipe locale 过滤，已有菜谱正文不自动翻译。

### 后果

- 同条件的不同语言请求拥有不同 recipeId；相同语言和同 idempotencyKey 继续重放既有结果。
- MySQL generation request 与 recipe 均保存 locale；旧记录和缺少字段的旧快照兼容默认 `zh-CN`。
- 语言错误的模型输出最多修复一次，仍不一致即失败关闭；不保存原始模型输出，也不引入翻译服务。
- UI 切换只影响固定文案和下一次生成，已打开菜谱保持其生成语言。

---

## D-027：用户身份与数据所有权采用 guest/registered 两态

**状态：** Accepted
**日期：** 2026-07-29

### 决策

正式产品身份只保留 `guest` 与 `registered` 两态，不把 `anonymous` 作为独立产品身份。当前 P0 继续支持游客体验；未来 guest 注册时直接升级到 registered，数据认领必须由已验证的服务端会话、用户确认、幂等 merge operation 和可回滚事务完成。

所有权必须由服务端验证的 subject 推导。raw guestId、请求体中的 userId/ownerId、设备 ID 和 recipeId 都不能单独作为授权依据。生成请求、私有生成菜谱、History、收藏、偏好和安全条件未来归 guest subject 或 registered userId；语言、recipeCache、recentRecipes 和临时烹饪进度可保持设备本地。

### 后果

- 本阶段不创建正式 users/auth identities、owner migration、注册登录 API、登录注册页面或伪用户；阶段 1 允许创建受控 guest identity/session 基础和游客会话 API。
- 后续身份数据库、会话、guest claim/merge 和现有业务表 owner 迁移必须按 `docs/adr/0004-user-identity-and-data-ownership.md` 分阶段实施。
- D-010 的 guest → anonymous → registered 路径和 D-017 的旧 Supabase ownership 说明不再作为当前实现依据；D-016 的内网 Node.js + MySQL 后端决策保持有效。

---

## 新决策模板

```markdown
## D-XXX：标题

**状态：** Proposed
**日期：** YYYY-MM-DD

### 背景

为什么需要决策？当前限制是什么？

### 备选

1. 方案 A；
2. 方案 B；
3. 维持现状。

### 决策

选择什么，以及明确不选择什么。

### 原因

与产品、安全、成本、复杂度和长期维护的关系。

### 后果

正面、负面、迁移和测试影响。

### 重新评估触发

什么事实变化时允许重新讨论。
```
