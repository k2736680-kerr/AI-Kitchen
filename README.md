# AI Kitchen Enterprise Blueprint

> AI 厨房助手企业级工程蓝图。该仓库是产品、工程、AI、安全、测试和发布的长期事实来源，使开发者与不同 AI 编程工具可以跨聊天、跨阶段、跨模型持续协作，而不依赖某一次对话记忆。

| 项目属性 | 当前值 |
|---|---|
| 项目名称 | AI Kitchen / AI 厨房助手 |
| Blueprint 版本 | **1.0.0 — Blueprint Complete** |
| 基线来源 | 《AI 厨房助手项目开发蓝图 V2.0》 |
| Blueprint 状态 | 四阶段文档体系已完成并通过结构检查 |
| 产品实现状态 | **尚未开始正式编码** |
| 下一阶段 | 创建 Monorepo、Expo 骨架和 development 环境 |
| 优先平台 | Android，稳定后扩展 iOS |
| 目标周期 | 12–18 周达到可上架质量 |
| 协作方式 | 非专业开发者主导 + AI 编程工具协作 |
| 最后更新 | 2026-07-27 |

---

## 1. 重要状态说明

**Blueprint 完成不等于 App 已开发完成。**

当前已经完成的是产品、架构、数据库、API、身份、AI、规则、安全、营养、隐私、移动端、测试、部署、商店合规和 AI 工具规则的目标设计。当前尚未创建或验证：

- 正式 pnpm Monorepo；
- Expo App；
- Supabase 项目、数据库迁移和 RLS；
- Edge Function/API；
- 共享 Zod Schema 包；
- AI Provider、Prompt Registry、Rule Engine；
- 本地数据库、同步和 E2E；
- EAS 构建、监控和商店版本。

实现进度只以 `PROJECT_STATE.md` 和 `CURRENT_STATUS.md` 为准。任何 AI 都不得把本文档中的目标代码示例称为已运行实现。

---

## 2. 本仓库解决的问题

AI Kitchen 同时涉及移动端、服务端、数据库、AI 输出、食品安全、营养估算、用户隐私、成本和应用商店发布。若只依赖聊天，容易出现：

- App、API、数据库和 Prompt 对同一字段定义不同；
- 不同 AI 反复重建项目；
- 计划被误写成完成；
- AI Key、RLS、账户数据或过敏约束被错误处理；
- 重复点击造成重复生成和计费；
- 新功能推翻已有架构；
- 关键决策无法追溯；
- 发布材料与真实数据流不一致。

Blueprint 通过“治理文档 + 专项设计 + 客户端/交付规范 + AI 工具规则”建立可执行的工程事实系统。

---

## 3. 文档优先级

发生冲突时按以下顺序处理：

1. `DEVELOPMENT_PROTOCOL.md`：安全、质量、工作流和发布门禁；
2. `DECISIONS.md`：已接受或取代的架构决策；
3. 相关专项设计文档；
4. `02_ARCHITECTURE.md`；
5. `01_PRODUCT_PRD.md`；
6. `00_PROJECT_MASTER_PLAN.md`；
7. `PROJECT_STATE.md`；
8. `CURRENT_STATUS.md`；
9. `CHANGELOG.md`；
10. 单次聊天或临时建议。

聊天不得静默覆盖正式文档。改变已接受决策前必须新增/更新 ADR、评估迁移并同步相关文档。

---

## 4. 所有 AI 的强制阅读顺序

1. [`AI_CONTEXT.md`](./AI_CONTEXT.md)
2. [`DEVELOPMENT_PROTOCOL.md`](./DEVELOPMENT_PROTOCOL.md)
3. [`PROJECT_STATE.md`](./PROJECT_STATE.md)
4. [`CURRENT_STATUS.md`](./CURRENT_STATUS.md)
5. 与任务相关的编号文档
6. [`DECISIONS.md`](./DECISIONS.md)
7. 最近的 [`CHANGELOG.md`](./CHANGELOG.md)

开始修改前必须确认实际仓库、分支、已有实现、允许范围、验收、测试和回滚。不得仅根据 Blueprint 猜测代码已经存在。

---

## 5. 核心工程硬边界

- React Native + Expo + TypeScript；
- Android 优先，iOS 在核心体验稳定后推进；
- App 只调用自有版本化后端；
- AI Key 和 Service Role Key 只存在受控服务端；
- App/API/测试共享请求、响应、错误和 Recipe Schema；
- 食材使用标准 ID，显示名、别名和标准业务名分离；
- 模型只生成不可信 Recipe Candidate；
- 服务端通过 Schema、业务、Food Safety 和 Nutrition 后组装 Final Recipe；
- Food Safety 不可用时失败关闭；
- Nutrition 不可用时结构化降级；
- 所有权来自服务端验证 subject，并由 RLS 再次强制；
- `requestId`、`idempotencyKey`、状态和成本全链路追踪；
- development、staging、production 数据、密钥和发布完全隔离；
- 未实际执行测试不得称为完成。

---

## 6. 完整文档索引

### Phase 1 — 治理、产品与总体架构

| 文档 | 作用 |
|---|---|
| [`README.md`](./README.md) | 入口、状态、索引与使用方法 |
| [`AI_CONTEXT.md`](./AI_CONTEXT.md) | 所有 AI 必读上下文和硬边界 |
| [`DEVELOPMENT_PROTOCOL.md`](./DEVELOPMENT_PROTOCOL.md) | 开发宪法、Git、测试和发布协议 |
| [`PROJECT_STATE.md`](./PROJECT_STATE.md) | 相对稳定的真实状态 |
| [`CURRENT_STATUS.md`](./CURRENT_STATUS.md) | 当前任务和跨聊天交接状态 |
| [`00_PROJECT_MASTER_PLAN.md`](./00_PROJECT_MASTER_PLAN.md) | 12–18 周实施路线与阶段退出条件 |
| [`01_PRODUCT_PRD.md`](./01_PRODUCT_PRD.md) | 用户、范围、需求、业务规则与验收 |
| [`02_ARCHITECTURE.md`](./02_ARCHITECTURE.md) | 端到端架构、组件责任和信任边界 |
| [`CHANGELOG.md`](./CHANGELOG.md) | 实际变化记录 |
| [`DECISIONS.md`](./DECISIONS.md) | 架构决策 ADR |

### Phase 2 — 核心技术专项

| 编号 | 文档 | 作用 |
|---|---|---|
| 03 | [`03_DATABASE_DESIGN.md`](./03_DATABASE_DESIGN.md) | PostgreSQL、规范化、Snapshot、索引、RLS、迁移、保留 |
| 04 | [`04_API_CONTRACT.md`](./04_API_CONTRACT.md) | REST、Envelope、鉴权、幂等、错误、分页、兼容 |
| 05 | [`05_AUTH_AND_IDENTITY.md`](./05_AUTH_AND_IDENTITY.md) | guest/anonymous/registered、会话、升级、删除 |
| 06 | [`06_AI_ENGINE.md`](./06_AI_ENGINE.md) | Provider Adapter、状态机、超时、重试、成本和故障 |
| 07 | [`07_PROMPT_ENGINEERING.md`](./07_PROMPT_ENGINEERING.md) | Prompt Registry、版本、注入防护、评估、灰度、回滚 |
| 08 | [`08_RULE_ENGINE.md`](./08_RULE_ENGINE.md) | 确定性规则、finding、冲突、版本、回放和门控 |
| 09 | [`09_FOOD_SAFETY_RULES.md`](./09_FOOD_SAFETY_RULES.md) | 过敏、危险、来源、失败关闭、撤回和安全测试 |
| 10 | [`10_RECIPE_SCHEMA.md`](./10_RECIPE_SCHEMA.md) | Candidate、Final Recipe、Snapshot 和跨字段不变量 |
| 11 | [`11_NUTRITION_ENGINE.md`](./11_NUTRITION_ENGINE.md) | 数据来源、单位、计算、覆盖率、置信度和降级 |
| 12 | [`12_PRIVACY_DATA_MAP.md`](./12_PRIVACY_DATA_MAP.md) | 数据流、第三方、日志、保留、删除和商店申报映射 |

### Phase 3 — 客户端、测试与交付

| 编号 | 文档 | 作用 |
|---|---|---|
| 13 | [`13_MOBILE_APP_ARCHITECTURE.md`](./13_MOBILE_APP_ARCHITECTURE.md) | Feature、Use Case、Domain、Repository、路由和错误 |
| 14 | [`14_EXPO_AND_NATIVE_STRATEGY.md`](./14_EXPO_AND_NATIVE_STRATEGY.md) | Expo Go、Development Build、Config Plugin、EAS、OTA |
| 15 | [`15_UI_UX_SYSTEM.md`](./15_UI_UX_SYSTEM.md) | 信息架构、Token、状态、安全 UI 和可访问性 |
| 16 | [`16_STATE_MANAGEMENT.md`](./16_STATE_MANAGEMENT.md) | Server/Local/UI state、Query、Store、状态机 |
| 17 | [`17_LOCAL_STORAGE_AND_SYNC.md`](./17_LOCAL_STORAGE_AND_SYNC.md) | SecureStore、SQLite、命名空间、同步、迁移和冲突 |
| 18 | [`18_TEST_STRATEGY.md`](./18_TEST_STRATEGY.md) | 测试金字塔、RLS、AI、安全、E2E、真机与门禁 |
| 19 | [`19_OBSERVABILITY.md`](./19_OBSERVABILITY.md) | 日志、指标、追踪、告警、SLO 和事故响应 |
| 20 | [`20_DEPLOYMENT_AND_RELEASE.md`](./20_DEPLOYMENT_AND_RELEASE.md) | CI/CD、迁移、版本组合、灰度、签名和回滚 |
| 21 | [`21_STORE_COMPLIANCE.md`](./21_STORE_COMPLIANCE.md) | Google Play、App Store、隐私、权限、素材和审核 |

### Phase 4 — AI 编程工具与交接

| 文件 | 作用 |
|---|---|
| [`.cursor/rules/00-core-context.mdc`](./.cursor/rules/00-core-context.mdc) | Cursor 全局项目上下文 |
| [`.cursor/rules/10-safety-and-data.mdc`](./.cursor/rules/10-safety-and-data.mdc) | Cursor 安全与数据硬边界 |
| [`.cursor/rules/20-typescript-architecture.mdc`](./.cursor/rules/20-typescript-architecture.mdc) | Cursor TypeScript 与架构规则 |
| [`.cursor/rules/30-testing-and-proof.mdc`](./.cursor/rules/30-testing-and-proof.mdc) | Cursor 测试与完成证明 |
| [`.cursor/rules/40-docs-and-status.mdc`](./.cursor/rules/40-docs-and-status.mdc) | Cursor 文档和状态维护 |
| [`CLAUDE.md`](./CLAUDE.md) | Claude Code 项目指令 |
| [`AGENTS.md`](./AGENTS.md) | Codex/通用 Coding Agent 仓库规则 |
| [`CODEX.md`](./CODEX.md) | Codex 任务与审查流程补充 |
| [`CHATGPT_PROJECT_INSTRUCTIONS.md`](./CHATGPT_PROJECT_INSTRUCTIONS.md) | ChatGPT Project 可复制指令 |
| [`HANDOFF_TEMPLATE.md`](./HANDOFF_TEMPLATE.md) | 跨聊天、工具、分支和人员交接模板 |

### 完成与审计

- [`BLUEPRINT_COMPLETION_REPORT.md`](./BLUEPRINT_COMPLETION_REPORT.md)：文件清单、一致性检查、未决事项和开工顺序。

---

## 7. 推荐正式代码仓库结构

```text
ai-kitchen/
├── apps/
│   └── mobile/
├── packages/
│   ├── shared/
│   ├── domain/
│   └── config/
├── supabase/
│   ├── functions/
│   ├── migrations/
│   └── seed/
├── tests/
│   ├── ai-cases/
│   ├── contracts/
│   └── e2e/
├── scripts/
├── docs/                     # 本 Blueprint 可放入此目录
├── .cursor/rules/
├── AGENTS.md
├── CLAUDE.md
└── package.json
```

当前目录仍是文档仓库，不表示该代码结构已创建。

---

## 8. 产品范围

### P0 可运行原型

食材选择、人数/时间、固定数据流程、一份真实 AI Final Recipe、本地历史、错误状态、Android 模拟器和一台真机。

### P1 内部测试

匿名身份、云历史/收藏、过敏/忌口/厨具、烹饪模式、基础安全规则、反馈、限流、成本和监控，10–20 人内测。

### P2 商店发布

正式账号升级、账户删除、营养来源/置信度、隐私材料、崩溃监控、签名、灰度、回滚、Android/iOS 真机和商店材料。

拍照、扫码、周菜单、购物清单、家庭共享、多语言、语音、会员和图片属于后续功能池，不得未经 ADR 插入 P0/P1。

---

## 9. 从 Blueprint 进入编码

下一项正式任务应是：

1. 创建 Git 仓库和 pnpm Monorepo；
2. 初始化 `apps/mobile` Expo TypeScript；
3. 建立 `packages/shared` 和 `packages/domain`；
4. 建立 format/lint/typecheck/unit test；
5. 创建固定 Recipe Fixture；
6. 完成首页→条件→详情的固定数据流程；
7. 在 Android 模拟器和一台真机验证；
8. 更新状态并提交 `v0.1.0-prototype` 前的可运行 commit。

在开始数据库、Auth 和真实 AI 前，先证明固定数据移动端主流程可运行。

---

## 10. 任务模板

```markdown
项目：AI Kitchen
当前阶段：
分支和最近可运行 commit：
本次目标：
现状/完整错误：
允许修改：
禁止修改：
验收标准：
测试命令：
回滚方式：
```

完成后必须报告文件、行为、真实测试、未验证项、风险、回滚和文档更新。

---

## 11. Blueprint 完成结论

四个文档阶段已经完成：治理与总设计、核心技术专项、客户端与交付、AI 工具规则。当前文档体系已足以让下一位 AI 或开发者从同一架构基线创建代码仓库。后续任何实现仍必须逐阶段完成测试和门禁；Blueprint 不能替代真实代码、迁移、真机和生产验证。
