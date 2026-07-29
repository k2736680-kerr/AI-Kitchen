# Current Status — 当前开发任务

> 本文件记录当前真实状态。计划、示例和目标设计不得冒充实现完成。

## 当前身份与数据所有权基线（2026-07-29）

- 当前只有 guest 能力，没有正式注册、登录、账号会话或跨设备恢复。
- 当前 `guestId` 在 Mobile Store 初始化时由时间戳和随机值生成，未通过 AsyncStorage/SecureStore 持久化；它是当前会话 namespace，不是认证凭据。重建 Store、App 重启、卸载或清除数据都可能产生新的值。
- Remote API 目前将客户端提供的 guestId 写入 generation request 和 recipe history；`ai_kitchen_recipes` 当前没有 owner 字段，recipe 读取也没有基于身份的授权校验。因此现有 guest 数据是过渡期业务数据，不应被当作安全的账号私有边界；Fixture/公共目录才是公共数据。
- 本轮新增 [ADR-0004](docs/adr/0004-user-identity-and-data-ownership.md)（决策索引 D-027）：正式产品身份采用 `guest` 与 `registered` 两态，不保留 `anonymous` 作为独立产品身份；P0 继续游客体验，不创建用户表、登录页面、认证 API 或迁移。
- 后续正式身份必须由 API 从已验证会话确定 userId，不能信任请求体中的 userId/ownerId/raw guestId；guest 注册时采用用户确认的、幂等且可回滚的数据认领/合并。
- `recipeCache`、`recentRecipes`、语言设置和当前烹饪进度目前属于设备本地/当前会话；生成请求、生成菜谱和历史在未来账号化后分别归 guest subject 或 registered userId。收藏、偏好、过敏原、忌口和自定义食材必须归身份主体。

## 身份阶段 1：游客身份数据库与服务端会话基础（COMPLETED）

- 已实现服务端 UUID guest identity、`crypto.randomBytes(32)` opaque token、SHA-256 token hash、默认 180 天 `SESSION_TTL_DAYS` 和 MySQL session 校验。
- 已新增 `POST /api/v1/auth/guest-session`、`GET /api/v1/auth/session`；Health 仍无需身份。
- 已将生成、动态菜谱详情、History 和 visit 改为 Bearer session 身份；请求体/查询参数中的旧 guestId 仅兼容接收并完全忽略。
- Mobile 已接入 Expo SecureStore、启动 bootstrap、已有 token 校验和并发 bootstrap Promise；token 不进入普通 Store、AsyncStorage、URL 或日志。
- 已新增 migration 003 和 API/Shared/Mobile 身份测试；真实 MySQL 迁移已执行并幂等重跑，Pixel_8a 已完成远程生成冒烟和应用重载保持验证。

> 本节是当前事实基线；下方按阶段记录的旧状态保留历史，不覆盖本节及 ADR-0004 的结论。

## Mobile product UI/UX and internationalization

- Mobile has a shared food-focused design system: warm background, white cards, sage primary actions, semantic alert colors, consistent type scale, spacing, radius and shadow tokens.
- Home, generation conditions, generating/no-match states, recipe detail, cooking, Explore and History now use shared screen/header/card/button/notice primitives.
- Bottom Tabs now expose `Home` / `Explore` / `History` / `Profile`; the new Profile surface is guest-only and does not create login, registration, mock account or sign-out flows.
- Profile shows guest status, a coming-soon account entry, a language shortcut into the existing `/settings`, placeholder Terms/Privacy routes and an About page with a shared app-version source.
- Terms of Service and Privacy Policy pages are explicit development placeholders and must be replaced before any formal release.
- `zh-CN` and `en-US` UI support is implemented. Device language selects the first-run default (unsupported languages fall back to Chinese); Settings persists a local selection and applies it immediately.
- Tabs, static page copy, choices and user-facing status copy are mapped through the i18n resource layer. Business identifiers and GenerationRequest/API schemas are unchanged.
- 标准食材目录现以稳定 `id` 与 `category` 为业务值，并为全部 10 项提供 `zh-CN`/`en-US` 名称及别名。展示、当前语言搜索和菜谱食材引用均在 Mobile presentation 边界按语言解析；自定义食材保留用户原始输入。
- 英文别名仅在有自然且有价值的译名时展示；未知标准 ID 依次回退到当前语言、默认语言及人类可读格式化名称，避免直接显示内部 ID。
- Remote dynamic recipes now carry `recipe.locale` (`zh-CN`/`en-US`). Mobile snapshots the current language into `GenerationRequest v1`; locale participates in request hashing/idempotency, Provider output validation and MySQL persistence. Existing snapshots default to `zh-CN`, recipe bodies are never silently translated, and remote/session history is filtered by the current locale.
- Recipe steps normalize literal `\\n` for display, ingredient reference IDs are no longer rendered in cooking UI, duplicate session and nutrition notices are removed, and History separates blocking empty/error states from a non-blocking refresh warning when cached content exists.
- Language preference is local AsyncStorage only; it is not account-synced or sent to the API. The current guest-session bootstrap mechanism remains unchanged, and no Mobile backend, schema, Android or iOS native directory was added.

| 属性 | 当前值 |
|---|---|
| 更新时间 | 2026-07-28 |
| 当前阶段 | **P0 内网 Fastify/MySQL 菜谱生成服务：等待本机 `MYSQL_PASSWORD` 后执行真实 MySQL 联调** |
| 当前状态 | `IN_PROGRESS` |
| Blueprint 版本 | `1.0.0` |
| 产品代码状态 | `P0_CORE_FLOW_AND_INTRANET_API_V1_IMPLEMENTED` |
| 代码分支 | `main` |
| 最近可运行 commit | 本轮内网 API 与 Mobile Adapter 提交完成后更新 |
| 当前环境 | pnpm Workspace + Expo SDK 57 默认模板 |

---

## P0 固定数据原型：首页到菜谱详情主链路

- 已完成首页食材选择、搜索、分类、重复选择保护、单项移除和清空全部选择。
- 已完成生成条件页：当前食材摘要、无食材提示、返回首页、默认人数/最大时间/厨具条件、条件修改、提交状态保护；条件保存在当前会话 Store。
- 已完成本地菜谱生成边界：根据食材、最大时间和可用厨具确定性匹配现有菜谱，成功、无匹配和本地错误均有明确结果；不匹配不会兜底到同一菜谱。
- 已完成生成中页：摘要、取消、重复提交保护、成功自动跳转、失败重试、卸载后的异步更新保护。
- 已完成正式无匹配结果页；菜谱详情显示标题、描述、人数、时间、食材、步骤和安全/营养状态，并可进入 `/cooking/[recipeId]`。
- 成功生成或打开详情会按去重规则更新当前会话 `recentRecipes`，最近访问排在前面。
- 已完成 Blueprint P0 历史基础页，入口为底部“历史”Tab；有记录和无记录状态均为当前会话能力，点击记录进入详情。
- development local 模式的会话菜谱与历史仍未持久化；remote 模式已具备服务端菜谱和 guest 历史持久化代码，但尚未连接用户 MySQL、阿里云或部署后端。登录同步尚未实现。
- Pixel_8a 已通过独立 Metro 8083 基础冒烟：首页选择三项食材、修改人数、生成成功进入番茄鸡蛋面详情、进入烹饪第 1 步并完成一步。

## P0 固定数据原型：饮食偏好与安全生成条件

- 已完成 PRD 范围内的一般饮食偏好最小集合：素食、清淡少辣、简单易做、均衡饮食；选项可多选、取消、清除，状态保存在当前会话。
- 已完成 PRD 范围内的已知过敏原选择：鸡蛋、小麦、牛奶、花生、虾蟹贝类；选择使用稳定代码，展示文案由共享映射提供。
- 已完成标准食材 ID 忌口选择；PRD 明确的自定义输入能力仅用于自定义食材，本轮未扩展自定义过敏原或自定义忌口文本。
- 已建立 `GenerationRequest` v1，字段范围为 `schemaVersion`、`selectedIngredientIds`、`customIngredients`、`servings`、`maxCookingTimeMinutes`、`availableTools`、`dietaryPreferences`、`allergens`、`excludedIngredients`。
- 生成开始时将不可变请求快照保存到当前会话 Store；生成中消费快照，返回条件页修改不会污染正在执行的请求。
- 本地生成器按食材、最大时间、厨具、一般偏好、过敏原、忌口顺序确定性筛选；过敏原和忌口为硬过滤，无安全候选时进入正式无匹配页。
- 已选食材与过敏原或忌口冲突会在提交前明确提示并阻止提交；自定义食材与过敏原同时存在时因无法确认映射而阻止提交。
- 菜谱详情新增饮食标签、过敏原提示、难度信息和一般性安全提醒；不声称绝对安全。
- 当前默认仍为本地确定性生成；Remote Adapter 与版本化 API 已完成但未接真实 AI 或已部署后端，条件和历史仍未持久化。

## 内网版本化菜谱生成 API

- 已完成 `apps/api`：Fastify `GET /api/v1/health`、`POST /api/v1/recipes/generate`、`GET /api/v1/recipes/:recipeId`、`GET /api/v1/history`、`POST /api/v1/history/visit`。
- 已完成 MySQL migration runner 和三张业务表：generation request 幂等、已校验 recipe snapshot、guest 历史 upsert；统一 utf8mb4/UTC。guestId 仅为过渡期业务标识，不是认证凭据。
- 已完成阿里云百炼 `qwen3.7-plus` Provider、JSON 提取、Schema/安全校验、一次修复、35 秒 Provider/40 秒服务端 deadline；真实 Key 未配置，未调用真实 AI。
- 已完成 Mobile Local/Remote Adapter、45 秒超时、Abort、remote recipe cache、远程详情和远程历史；remote 模式不回退到 Fixture。
- Fastify 注入、Provider、事务替身测试通过；真实 MySQL、阿里云和内网部署待填写环境变量后联调。
- Windows 开发机的 `apps/api/.env` 已按内网数据库地址创建且被 Git 忽略；当前只缺少本机 `MYSQL_PASSWORD`，因此尚未尝试真实 migration、表/索引/权限查询或 health 请求，也不会伪称已连接。

---

## P0 固定数据原型步骤 1

- Shared Ingredient、Generation 与 Recipe 最小契约已建立。
- 已新增 10 条固定食材、3 条固定 Recipe Fixture（含缺少食材示例）和固定错误 Fixture。
- Fixture 契约测试已通过。
- 移动端页面、本地 Store、AI、Supabase、Auth、数据库、营养和食品安全引擎尚未实现。

## P0 固定数据原型步骤 2A

- `@ai-kitchen/shared` 已补充只开放包根的正式源码入口，仍为 Monorepo 内部私有包。
- mobile 已在 `dependencies` 中声明 `@ai-kitchen/shared: workspace:*`；Workspace 链接和 TypeScript 导入验证均已通过。
- 未增加构建产物、TypeScript 路径映射、Metro/Babel 配置；Repository、Store 和页面尚未实现。

## P0 固定数据原型步骤 2

- mobile Fixture Repository 已建立，支持固定食材搜索、名称规范化及固定菜谱读取。
- 已建立 session guest namespace 的内存状态，支持食材选择、自定义添加与重复校验、生成草稿、最近菜谱和烹饪步骤状态。
- 状态尚未接入正式页面，App 重启后不会保留；未接入 Supabase、Auth、数据库、API 或 AI。

## P0 固定数据原型步骤 3

- `P0StoreProvider` 已接入根布局，首页已替换为 AI Kitchen 食材选择流程。
- 已完成分类切换、名称/别名搜索、标准食材选择与移除、自定义食材校验及生成条件入口。
- 已新增生成条件页，支持人数、最大时间和厨具编辑；当前会话返回首页后保留草稿。
- Pixel_8a 已验证 Metro 加载、首页中文内容和滚动食材列表；生成中、菜谱详情、历史和烹饪模式尚未实现。
- 页面状态尚未持久化，未接入 Supabase、Auth、数据库、API 或 AI。
- 用户已在 Pixel_8a 通过电脑键盘完成步骤 3 剩余交互验收：中文搜索“番茄”、清空搜索恢复列表、空输入提示、标准食材重复、自定义“香菇”添加/重复/移除、Explore 进入及返回 Home 后食材和生成草稿保留。
- 本次中文输入验收使用电脑键盘完成，不依赖 ADB 文本注入；验收结果不代表真实 AI、云端或持久化能力。

## P0 固定数据原型步骤 4

- 已完成固定生成服务、生成中状态、固定失败与重试、取消及异步卸载保护代码路径。
- 已完成固定菜谱详情、缺少食材展示和 `NOT_FOUND` 安全状态；根 Stack 已注册生成与详情路由。
- Pixel_8a 已完成生成路由和固定菜谱详情基础冒烟验证。
- 完整成功、取消、失败重试和缺少食材交互由用户后续体验验收；不作为功能提交门禁。
- 最近菜谱仍为当前会话内状态；模拟器或 App 重启后状态清空符合当前 P0 预期。
- 尚未接入真实 AI、API、Supabase、数据库、营养数据库或食品安全规则引擎；烹饪模式和历史页面尚未实现。

## P0 固定数据原型步骤 5A

- 已补齐当前会话内的结构化烹饪会话状态，按菜谱保存当前查看步骤、已完成步骤和完成状态。
- 支持同一菜谱会话恢复、切换菜谱隔离、完成后进入下一未完成步骤、重新开始指定菜谱及进度选择器。
- 状态仅存在于当前应用会话；App 或模拟器重启后清空。烹饪页面将在步骤 5B 实现，完整端到端流程尚未执行。

## P0 固定数据原型步骤 5B

- 已实现烹饪模式页面、步骤查看/完成、进度、完成态、退出保留和重新开始交互，并复用步骤 5A Store 会话状态。
- Pixel_8a 基础冒烟已通过：使用独立 Metro 端口 8083，基础 Expo 页面与 `/cooking/fixture-tomato-egg-noodles` 均实际渲染。
- 完整烹饪交互由用户后续体验验收；状态仍仅保存在当前应用会话。

## P0 固定数据原型后续切片：Explore 与会话内菜谱浏览

- 已将 Explore 从 Expo starter 占位页替换为固定菜谱浏览页，提供最近菜谱空状态、固定菜谱列表及进入详情操作。
- 最近菜谱读取现有 P0 Store 会话状态；未接入持久化、云端历史、收藏或后端服务。
- Pixel_8a 已验证 `/explore` 实际渲染标题、空状态、固定菜谱卡片和底部 Home/Explore 导航。

## 1. 已完成

### 第二阶段架构决策与共享契约

- [x] ADR-0001 身份、数据归属与隐私决策
- [x] ADR-0002 Development 环境与 Secret 边界决策
- [x] `@ai-kitchen/shared` 最小身份 Subject 与 API 错误契约及 10 项单元测试
- [ ] Supabase、Auth、数据库与迁移（尚未创建）
- [ ] Profile、Recipe、AI 与业务页面（尚未实现）

### Phase 1：治理与总体设计（10/10）

- [x] README、AI Context、Development Protocol
- [x] Project State、Current Status、Master Plan
- [x] Product PRD、Architecture、Changelog、Decisions

### Phase 2：核心技术专项（10/10）

- [x] Database Design
- [x] API Contract
- [x] Auth and Identity
- [x] AI Engine
- [x] Prompt Engineering
- [x] Rule Engine
- [x] Food Safety Rules
- [x] Recipe Schema
- [x] Nutrition Engine
- [x] Privacy Data Map

### Phase 3：客户端、测试与交付（9/9）

- [x] Mobile App Architecture
- [x] Expo and Native Strategy
- [x] UI/UX System
- [x] State Management
- [x] Local Storage and Sync
- [x] Test Strategy
- [x] Observability
- [x] Deployment and Release
- [x] Store Compliance

### Phase 4：AI 工具和交接（完成）

- [x] Cursor project rules（5 份）
- [x] `CLAUDE.md`
- [x] `AGENTS.md`
- [x] `CODEX.md`
- [x] `CHATGPT_PROJECT_INSTRUCTIONS.md`
- [x] `HANDOFF_TEMPLATE.md`

---

## 2. 本轮实际完成

- 建立 pnpm 11.14.0 Workspace：`apps/mobile` 与 `packages/shared`；pnpm Store 固定为项目本地 `.pnpm-store`。
- 初始化 Expo SDK 57 默认 Expo Router 模板，应用元数据为 `AI Kitchen` / `ai-kitchen` / `ai-kitchen` scheme。
- 创建最小 `@ai-kitchen/shared` 空模块，并直接声明 TypeScript。
- 修复模板的 CSS 类型声明与 Web hydration Hook，使 TypeScript 严格检查通过；采用 Expo Flat Config ESLint。
- 实际通过 `pnpm install`、`pnpm install --frozen-lockfile`、Expo Doctor 20/20、mobile/shared/root typecheck 与 mobile/root lint。
- 在 Android `Pixel_8a` 模拟器中实际启动 Expo Go：默认 Home 页面与 Explore 路由均可见并可切换；Metro 首次 Android bundle 成功，无红屏、模块找不到、CSS 或 JavaScript 阻断错误。
- 确认未生成 `apps/mobile/android` 或 `apps/mobile/ios`。
- 新增 `docs/decisions/ADR-0001-identity-data-ownership.md`，锁定 guest、anonymous、registered、`owner_id = auth.uid()`、RLS 与 User-scoped/Admin client 边界。
- 修正最近完成提交事实为 `712465a`。
- 步骤 2.2 新增 `docs/decisions/ADR-0002-environment-secret-boundary.md` 与 `apps/mobile/.env.example`，只定义公开变量和环境/Secret 隔离边界。
- 当前没有真实 Supabase Project、URL、Key、Secret、Auth、数据库或迁移；`.env.example` 不代表 Supabase 已接入。

---

## 3. 仍未实施

以下仍为 `NOT_STARTED`：

- P0 业务页面和固定 Recipe Fixture；
- Supabase projects/Auth/DB/RLS；
- API/Edge Functions；
- 共享 Recipe Schema 代码；
- AI Provider、Prompt Registry、Rule/Nutrition Engine；
- Local DB/Sync；
- 自动化测试/CI/CD（本轮仅执行初始化静态检查）；
- EAS build、监控和商店提交。

本阶段仅完成架构决策设计；Supabase、Auth、数据库和迁移仍未创建或实现。

任何 AI 不得把文档中的示例代码、DDL、接口或 DoD 当作已运行系统。

---

## 4. 正式编码前待确认

这些不阻断创建固定数据原型，但必须在对应阶段前确认：

1. 首个 AI Provider 与备用 Provider；
2. 标准食材数据来源与许可；
3. 首发地区和食品安全专业审核责任；
4. 营养数据来源与商业许可；
5. 监控供应商和数据区域；
6. 首发地区、隐私政策语言和支持渠道；
7. 移动端 E2E 具体工具；
8. 免费生成次数和预算门限；
9. 正式 App 名称、品牌和包标识。

---

## 5. 下一项唯一任务

**在用户内网环境部署 `apps/api`，执行 MySQL migration，并以真实阿里云百炼凭据完成 Mobile→API→MySQL→Provider 的受控联调。**

范围：

- 填写 `apps/api/.env` 与 `apps/mobile/.env`（只在本地/部署 Secret 管理中保存）；
- 执行已提交的 MySQL migration，运行 API 并完成 health、生成、详情、历史的真实链路验证；
- 不在此阶段扩展登录、云同步、数据库供应商或新的 AI 功能。

---

## 6. 禁止事项

- 不得一次性实现整个 App；
- 不得绕过固定数据原型直接接所有云服务；
- 不得把 Key 放入客户端；
- 不得重写 Blueprint 已接受架构；
- 不得用文档检查代替代码测试；
- 不得在没有真实仓库时声称任何功能已开发。

---

## 7. 回滚

本轮新增工程初始化文件与 Expo 默认模板、更新本状态和变更日志；没有数据库、密钥、生产环境或业务数据变化。工程初始化提交前可通过删除未提交的新工程文件并恢复本轮状态文档变更回到 `1481cb0`；提交后可回退该独立初始化提交。
