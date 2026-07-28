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
- 完整成功、取消、失败重试和缺少食材端到端交互尚未执行，转入后续自动化测试阶段，不作为本步骤提交门禁。
- 最近菜谱仍为当前会话内状态；模拟器或 App 重启后状态清空符合当前 P0 预期。
- 尚未接入真实 AI、API、Supabase、数据库、营养数据库或食品安全规则引擎；烹饪模式和历史页面尚未实现。

## P0 固定数据原型步骤 5A

- 已补齐当前会话内的结构化烹饪会话状态，按菜谱保存当前查看步骤、已完成步骤和完成状态。
- 支持同一菜谱会话恢复、切换菜谱隔离、完成后进入下一未完成步骤、重新开始指定菜谱及进度选择器。
- 状态仅存在于当前应用会话；App 或模拟器重启后清空。烹饪页面将在步骤 5B 实现，完整端到端流程尚未执行。

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
