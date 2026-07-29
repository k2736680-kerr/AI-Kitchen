# Changelog

本文件记录 AI Kitchen Blueprint、代码、Schema、数据库和发布版本的显著变化。文档版本与 App 版本独立；当前尚无 App 版本。

---

## 用户身份与数据所有权方案

- 新增 `docs/adr/0004-user-identity-and-data-ownership.md`，完成当前 guestId、现有 MySQL 记录关系、数据所有权、guest 升级、已有账号登录、退出和删除账号的架构审计。
- 正式身份模型确定为 `guest` / `registered` 两态；不保留 `anonymous` 作为独立产品状态。当前 P0 仍只提供游客体验，不新增用户表 migration、认证 API、登录注册页面或伪用户。
- 明确后续服务端必须从验证后的会话确定 owner，guestId 不能作为正式安全凭证；生成请求、菜谱、历史、收藏、偏好和安全条件在账号化后归身份主体，语言、缓存和临时烹饪进度可保留在设备本地。
- 明确 guest 注册和登录已有账号都必须用户确认后执行幂等合并；保持 recipeId 和可审计合并记录，冲突不静默覆盖；账号删除、服务条款、隐私政策和“我的”Tab只完成边界设计。
- 本轮仅修改 ADR、决策索引、当前状态和变更记录，未修改 API、数据库、migration、Provider、Mobile 业务代码或设备配置。

---

## 动态菜谱多语言契约

- `GenerationRequest v1` 新增受限 `locale`，新版 Mobile 明确提交 `zh-CN` 或 `en-US`，旧请求兼容默认 `zh-CN`；locale 纳入已有稳定 request hash 与幂等语义。
- `RecipeSchema` 新增内容生成语言 `recipe.locale`，服务端在 Schema 校验后按请求注入并保存；旧 MySQL 快照和旧 API payload 缺失时默认 `zh-CN`，不进行静默翻译。
- Provider Prompt、一次 repair 调用和轻量语言一致性校验按 locale 约束自然语言正文；错误语言修复一次后仍不合格即失败关闭，未校验原始输出不保存。
- History API、Remote Repository、session recent recipes 和 Explore 按 `recipe.locale` 过滤，切换 UI 语言重新读取对应历史，不删除另一语言菜谱。
- 新增 `002_add_recipe_locale` migration：generation request/recipe 均保存 locale，recipes 增加 locale 查询索引；真实 MySQL migration 已执行并复跑验证。

---

## 修复食材目录多语言显示

- 标准食材目录由中文 `displayName`/别名展示值改为稳定 `id`、`category` 与 `zh-CN`/`en-US` 本地化名称、别名；10 项标准食材均已补齐双语资源。
- Mobile 的食材网格、已选 Chip、生成摘要、菜谱食材和缺少食材提示统一通过 presentation formatter 解析当前语言；自定义食材继续保留用户原始文本。
- 当前语言搜索仅匹配该语言名称和别名，忽略大小写并清理首尾空格；跨语言目录值不会泄漏到当前界面。分类继续使用稳定 `categoryId` 与既有 i18n 文案。
- 新增目录完整性与中英文搜索单元测试；Pixel_8a 已验证英文不再显示中文食材/别名、切换中文后立即显示中文名称与别名、再切回英文即时刷新。

---

## 移动端产品化 UI/UX 与多语言

- 建立 Mobile 设计令牌与共享组件：暖色背景、白色卡片、sage 主操作、统一字号/间距/圆角/阴影和语义状态提示。
- 重构首页、生成条件、生成中/无匹配、菜谱详情、分步烹饪、Explore 与 History 的页面结构；清理展示层中的内部食材 ID、`\\n` 字符和重复产品提示。
- 新增 `zh-CN`/`en-US` 国际化、按设备语言的首次默认值、设置页即时切换与 AsyncStorage 本地保存；稳定业务枚举保持不变并由 UI 映射为本地化文案。
- 新增 `docs/MOBILE_DESIGN_I18N.md` 记录设计系统、语言策略和不改变 API/生成边界的约束。

---

## 内网 Fastify + MySQL 菜谱生成服务

- 补齐 Windows 内网 MySQL 本地环境模板，health 在成功连接时返回 `database: "connected"`；环境解析忽略无关系统变量，并允许空的百炼 Base URL 使用默认兼容地址。
- 本地 `apps/api/.env` 由 `.gitignore` 排除，仅保留待用户填写的 `MYSQL_PASSWORD`；真实数据库 migration 与 health 联调尚未执行。
- 正式后端从 Supabase Edge 原型迁移至 `apps/api`：Node.js、TypeScript、Fastify、MySQL 原生 migration 和阿里云百炼 `qwen3.7-plus` Provider。
- 新增 `/api/v1/health`、生成、recipe 读取、guest history 查询与 visit upsert；生成采用 MySQL 幂等、校验后 recipe snapshot 保存和事务式历史更新。
- Shared 契约增加远程 recipe/history DTO 与 `idempotency_conflict` 状态；Mobile Remote Adapter 改用 `/api/v1` 和 `EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL`，支持远程历史与动态菜谱缓存。
- 删除不再作为正式运行路径的 Supabase Edge Function 与 PostgreSQL migration；D-016 记录内网 Node.js + MySQL 决策。
- 尚未填写真实阿里云/内网 MySQL/Mobile 地址，因此真实 Provider、数据库和 Pixel_8a remote 联调未执行。

---

## 版本化后端菜谱生成 API

- 新增共享 Zod API 契约 v1：`GenerationApiRequest`、`GenerationApiResponse` 判别联合、Recipe 输出 Schema、错误码、版本常量和严格未知字段策略。
- 新增 `POST /functions/v1/recipes-generate` Edge Function，支持 CORS、请求校验、guest 身份边界、限流、幂等、deterministic/HTTP Provider、一次修复、超时、失败关闭和结构化最小日志。
- 新增 `generation_requests` migration，使用唯一 `idempotency_key` 和 RLS 默认拒绝；development 可显式使用单进程 memory store，生产应使用 Supabase service-role REST store。
- Mobile 生成状态机改为依赖 `RecipeGenerationRepository`，支持 development local/remote 配置、Remote API Adapter、45 秒超时、取消、错误映射和远程 Recipe 缓存。
- 当前未配置真实 Provider、未调用真实 AI、未部署 Supabase、未执行真实 Edge Runtime/容器联调；相关实现状态和启动命令见 `docs/API_GENERATION.md`。

## P0 固定数据原型：完善饮食偏好与安全生成条件

- 共享包新增 `GenerationRequest` v1，统一承载食材、人数、最大烹饪时间、可用厨具、饮食偏好、过敏原和忌口；页面与本地生成器不再各自定义请求字段。
- 生成条件页新增素食、清淡少辣、简单易做、均衡饮食多选，已知过敏原多选，以及基于标准食材 ID 的忌口多选；所有选择支持取消和清除，并保留在当前会话。
- Store 新增偏好、过敏原、忌口 actions，并在生成开始时保存不可变请求快照；生成中重试会创建新的请求快照。
- 本地确定性生成按食材→时间→厨具→偏好→过敏原→忌口筛选 Fixture；过敏原和忌口不会被普通偏好或兜底结果绕过，无安全候选进入无匹配结果页。
- Recipe Fixture 集中补充饮食标签、过敏原标签、难度、辣度和所需厨具；菜谱详情展示饮食标签与过敏原提示。
- 本阶段仍未接真实 AI、后端/API、数据库、持久化或云端同步；用户负责后续完整功能体验和验收。

## P0 固定数据原型：打通食材生成菜谱主流程

- 首页到生成条件、生成中、本地确定性匹配、无匹配结果、菜谱详情和开始烹饪已实际连通。
- 生成条件使用现有 Store 保存，支持人数、最大烹饪时间和可用厨具的默认值与修改；首页支持清空全部已选食材。
- 本地生成服务通过现有 Repository 读取菜谱，根据所选食材、时间和厨具匹配；无匹配进入正式空结果页，不会把所有输入返回同一菜谱。
- 生成中支持取消、成功自动跳转、失败重试、重复提交保护和卸载清理；成功生成或打开详情会更新当前会话 `recentRecipes`。
- 新增 Blueprint P0 历史基础页与底部“历史”Tab，按最近访问顺序去重展示当前会话记录。
- Pixel_8a 已在 Metro 8083 完成基础冒烟：首页选食材→修改条件→生成→详情→开始烹饪→完成一步。
- 本阶段仍为本地原型：未持久化、未接真实 AI、未接后端/API、未实现云端历史或登录同步；用户负责后续完整功能体验和验收。

## P0 固定数据原型步骤 2A

- `@ai-kitchen/shared` 增加正式源码根入口，mobile 声明 `workspace:*` 依赖。
- 已验证 Workspace 链接与 TypeScript 导入；未增加构建产物、路径映射、Repository、Store 或页面。

## P0 固定数据原型步骤 2

- 新增 mobile Fixture Repository 和 session guest namespace 内存状态。
- 支持食材搜索、选择、自定义添加及重复校验，以及生成草稿、最近菜谱和烹饪步骤状态。
- 状态未接入正式页面，App 重启后不保留；未接入 Supabase、Auth、数据库、API 或 AI。

## P0 固定数据原型步骤 3

- 根布局接入 P0 Store；首页支持固定食材分类、搜索、选择、移除和自定义添加。
- 新增生成条件页，支持人数、时间、厨具和当前会话草稿保留。
- Pixel_8a 验证 Metro 加载和首页内容；未实现生成中、菜谱详情、历史或烹饪模式。
- 用户确认 Pixel_8a 已完成中文搜索、清空恢复、标准重复、自定义食材添加/重复/移除、Explore 和返回 Home 状态保留验收；中文输入通过电脑键盘完成。

## P0 固定数据原型步骤 4

- 完成固定生成中、固定失败与重试、取消异步清理、固定菜谱详情及 `NOT_FOUND` 状态代码路径。
- Pixel_8a 已完成生成路由和固定菜谱详情基础冒烟验证。
- 完整成功、取消、失败重试和缺少食材端到端交互尚未执行，转入后续自动化测试阶段。
- 最近菜谱仅为当前会话内状态；未接入真实 AI、API、Supabase、数据库、营养数据库或食品安全规则引擎；烹饪模式和历史页面尚未实现。

## P0 固定数据原型步骤 5A

- 补齐当前会话内结构化烹饪会话状态，支持按菜谱恢复当前步骤、记录已完成步骤、完成状态、重新开始及进度选择器。
- 未创建烹饪页面或路由；步骤 5B 实现页面与交互。状态不持久化，未接入后端或数据库。

## P0 固定数据原型步骤 5B

- 实现烹饪模式页面与步骤交互，复用 5A cooking session Store，支持进度、步骤状态、完成态、退出保留和重新开始。
- Pixel_8a 基础冒烟通过：独立 Metro 端口 8083 下基础 Expo 页面及 `/cooking/fixture-tomato-egg-noodles` 实际渲染。
- 完整烹饪端到端流程转入后续自动化测试，未接入持久化或后端能力。

## P0 固定数据原型后续切片：Explore 与会话内菜谱浏览

- 将 Explore starter 页替换为固定菜谱浏览页，支持最近菜谱空状态、固定菜谱卡片和进入菜谱详情。
- 最近菜谱复用现有会话 Store；未实现持久化、云端历史或收藏。
- Pixel_8a 已验证 `/explore` 页面实际渲染。

## P0 固定数据原型步骤 1

- 新增 Ingredient、Generation 与 Recipe 最小共享契约。
- 新增 10 条固定食材、3 条固定 Recipe Fixture（含缺少食材示例）和固定错误 Fixture。
- 新增 Fixture 契约测试；未实现移动端页面、本地 Store、AI、Supabase、Auth、数据库、营养或食品安全引擎。

## [Unreleased]

### Added

- pnpm 11.14.0 Workspace：根配置、`apps/mobile`、`packages/shared`、`pnpm-lock.yaml` 与项目本地 `.pnpm-store`；
- Expo SDK 57 默认 Expo Router 模板，应用元数据为 AI Kitchen；
- 最小 `@ai-kitchen/shared` 空模块与直接 TypeScript 开发依赖；
- Expo Flat Config ESLint、CSS TypeScript 模块声明与 Web hydration Hook 修复。

### Validated

- `pnpm install` 与 `pnpm install --frozen-lockfile`；
- Expo Doctor 20/20；
- mobile/shared/root TypeScript 与 mobile/root ESLint；
- `Pixel_8a` Android 模拟器上的 Expo Go 默认 Home 页面和 Explore 路由切换；
- 未生成 Android/iOS 原生目录。

### Notes

- 本轮只完成工程初始化和默认模板验证；未实现业务页面、固定 Recipe Fixture、Supabase、Auth、数据库、AI、Food Safety、Nutrition、同步、测试体系或发布配置。

### Architecture Decision

- 新增 `docs/decisions/ADR-0001-identity-data-ownership.md`，明确 guest、anonymous、registered 边界、anonymous 升级保持 `auth.users.id`、`owner_id = auth.uid()`、RLS 默认拒绝、User-scoped/Admin Supabase client 与 API Key 安全边界。
- 明确本轮未实现 Auth、Supabase、数据库、迁移或业务功能。
- 新增 `docs/decisions/ADR-0002-environment-secret-boundary.md`；
- 新增 `apps/mobile/.env.example`，仅包含公开占位变量；
- 增强 mobile 环境文件忽略规则；
- 明确未创建真实 Supabase 资源、环境变量或 Secret。
- 新增 `@ai-kitchen/shared` 的 guest、anonymous、registered 身份 Subject 类型与纯类型守卫；
- 新增稳定 API 错误码、成功/失败 Envelope 及 10 项 Vitest 单元测试；
- 本步骤未实现 Supabase、真实身份服务、Auth、数据库或业务功能。

---

## [1.0.0] — 2026-07-27

### Added — Phase 2

- `08_RULE_ENGINE.md`：集中式确定性规则、findings、冲突、版本、回放、灰度和失败策略；
- `09_FOOD_SAFETY_RULES.md`：过敏、非食用物、加热、储存、来源、撤回和零放行测试；
- `11_NUTRITION_ENGINE.md`：营养来源、单位、克重、覆盖率、置信度、Snapshot 和降级；
- `12_PRIVACY_DATA_MAP.md`：数据分类、第三方 AI、日志、保留、删除、供应商和商店映射。

### Added — Phase 3

- `13_MOBILE_APP_ARCHITECTURE.md`；
- `14_EXPO_AND_NATIVE_STRATEGY.md`；
- `15_UI_UX_SYSTEM.md`；
- `16_STATE_MANAGEMENT.md`；
- `17_LOCAL_STORAGE_AND_SYNC.md`；
- `18_TEST_STRATEGY.md`；
- `19_OBSERVABILITY.md`；
- `20_DEPLOYMENT_AND_RELEASE.md`；
- `21_STORE_COMPLIANCE.md`。

### Added — Phase 4

- `.cursor/rules/` 五份 Project Rules；
- `CLAUDE.md`；
- `AGENTS.md`；
- `CODEX.md`；
- `CHATGPT_PROJECT_INSTRUCTIONS.md`；
- `HANDOFF_TEMPLATE.md`；
- `BLUEPRINT_COMPLETION_REPORT.md`。

### Changed

- README 升级为完整文档索引；
- `CURRENT_STATUS.md` 标记 Blueprint 完成、代码未开始；
- `PROJECT_STATE.md` 进入准备 P0 固定数据原型状态；
- `AI_CONTEXT.md` 更新真实状态和下一任务；
- `00_PROJECT_MASTER_PLAN.md` 标记 Phase 0 文档完成；
- `DECISIONS.md` 新增 D-020 至 D-026；
- Blueprint 版本升级为 1.0.0。

### Validated

- 计划文件全部存在；
- Markdown 代码块闭合；
- 相对链接检查；
- 旧“Phase 2 进行中/6 of 10”状态清理；
- 完整 ZIP 结构和完整性检查。

### Notes

- 本版本只有文档和 AI 工具规则；没有可运行 App、数据库、API、AI 接口或生产配置。

---

## [0.2.0] — 2026-07-27

### Added

- `03_DATABASE_DESIGN.md`；
- `04_API_CONTRACT.md`；
- `05_AUTH_AND_IDENTITY.md`；
- `06_AI_ENGINE.md`；
- `07_PROMPT_ENGINEERING.md`；
- `10_RECIPE_SCHEMA.md`。

### Confirmed

- Versioned REST 和 request status recovery；
- server-verified ownership；
- Candidate/Final Recipe 分离；
- Prompt Registry 和版本化工程资产。

---

## [0.1.0] — 2026-07-24

### Added

- 第一阶段 10 个治理、产品和架构文档；
- 初始 15 项架构决策；
- 第二至第四阶段文档路线。

### Confirmed

- React Native + Expo + TypeScript；
- Android 优先；
- Supabase Edge Functions + PostgreSQL + RLS；
- App 不直接调用模型；
- 共享 Schema；
- 标准食材 ID；
- AI 四层校验；
- Food Safety 失败关闭；
- requestId/idempotencyKey；
- 三环境隔离。

---

## 维护规则

- Added：新增用户能力、文档、API、表、规则、测试或工具；
- Changed：改变已有行为、字段、架构或流程；
- Fixed：修复可定位问题；
- Security：密钥、权限、越权、过敏或食品安全；
- Deprecated/Removed：明确弃用/移除和迁移。

禁止记录计划却写成完成，禁止使用“优化了一些内容”这类不可追踪描述。
