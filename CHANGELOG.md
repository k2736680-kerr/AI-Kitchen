# Changelog

本文件记录 AI Kitchen Blueprint、代码、Schema、数据库和发布版本的显著变化。文档版本与 App 版本独立；当前尚无 App 版本。

---

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
