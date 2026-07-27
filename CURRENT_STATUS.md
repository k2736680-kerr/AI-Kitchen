# Current Status — 当前开发任务

> 本文件记录当前真实状态。计划、示例和目标设计不得冒充实现完成。

| 属性 | 当前值 |
|---|---|
| 更新时间 | 2026-07-27 |
| 当前阶段 | **第二阶段：身份、数据归属与隐私基础** |
| 当前状态 | `IN_PROGRESS` |
| Blueprint 版本 | `1.0.0` |
| 产品代码状态 | `INITIALIZATION_COMPLETE`（尚未开发业务功能） |
| 代码分支 | `main` |
| 最近可运行 commit | `e268854 docs: define environment secret boundary` |
| 当前环境 | pnpm Workspace + Expo SDK 57 默认模板 |

---

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

**在创建任何 Supabase 资源前，先完成步骤 2.2 的待确认事项与 P0 范围评审。**

任务范围：

- 先定义固定 Recipe Fixture 与最小共享契约；
- 逐步完成首页→生成条件→详情固定数据流程及相关测试；
- 不接真实 AI、Auth、云数据库、迁移、RLS、Food Safety 或 Nutrition。

验收证据：可运行 commit、命令、测试结果、真机信息、截图/日志和回滚方式。

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
