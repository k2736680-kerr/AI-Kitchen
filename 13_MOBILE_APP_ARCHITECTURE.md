# 13 — Mobile App Architecture

> 本文定义 AI Kitchen React Native 客户端的模块、依赖方向、路由、数据访问、错误处理和演进边界。目标不是创建“能打开的 Expo Demo”，而是建立在功能增长后仍可测试、替换和维护的应用结构。

| 属性 | 内容 |
|---|---|
| 文档状态 | Draft / Ready for Implementation Planning |
| 技术基线 | React Native + Expo + TypeScript + Expo Router |
| 实施状态 | 尚未创建正式移动端仓库 |
| 依赖 | `02_ARCHITECTURE.md`、`04_API_CONTRACT.md`、`16_STATE_MANAGEMENT.md` |
| 最后更新 | 2026-07-27 |

---

## 1. 架构目标

- Android 优先，同时避免破坏 iOS 可移植性；
- 页面只负责交互和展示，不直接拼 API、SQL 或业务规则；
- 服务端状态、本地持久状态和临时 UI 状态分离；
- 所有 API 响应经过共享 Schema 校验；
- 身份切换时数据和缓存严格隔离；
- 离线可查看缓存菜谱和恢复烹饪进度；
- 生成请求支持幂等、取消和超时后恢复；
- 加载、空、失败、重试和不可用状态是正式设计的一部分；
- 核心流程可在 Android 模拟器和真机自动/手工验证；
- 新功能不需要修改无关页面或复制领域逻辑。

---

## 2. 分层模型

```text
Routes / Screens
  ↓
Feature UI + Feature Hooks
  ↓
Application Use Cases
  ↓
Domain Types / Policies
  ↓
Repositories / API Client / Local Database
  ↓
Expo & Native Adapters
```

依赖只能向内。Domain 不依赖 React、Expo、Supabase SDK 或具体缓存库。

### 2.1 Presentation

负责：路由、布局、输入、可访问性、错误展示。不得决定食品安全、所有权和可信营养来源。

### 2.2 Application

负责：`GenerateRecipe`、`SaveFavorite`、`ResumeCookingSession` 等用例，协调 Repository 和状态，不包含平台 UI。

### 2.3 Domain

负责：共享类型、Recipe 不变量、单位和纯规则。Domain 可与服务端共享一部分，但客户端不能执行并伪造可信放行。

### 2.4 Infrastructure

负责：HTTP、SecureStore、本地数据库、网络状态、通知、日志和 Expo API 适配。

---

## 3. 推荐目录

```text
apps/mobile/
├── app/                         # Expo Router，仅路由入口
│   ├── _layout.tsx
│   ├── (tabs)/
│   ├── recipe/[recipeId].tsx
│   ├── generate.tsx
│   └── cooking/[recipeId].tsx
├── src/
│   ├── features/
│   │   ├── ingredients/
│   │   ├── generation/
│   │   ├── recipes/
│   │   ├── cooking/
│   │   ├── history/
│   │   ├── favorites/
│   │   ├── preferences/
│   │   └── feedback/
│   ├── application/
│   ├── domain/
│   ├── data/
│   │   ├── api/
│   │   ├── repositories/
│   │   ├── local/
│   │   └── mappers/
│   ├── platform/
│   ├── design-system/
│   ├── navigation/
│   ├── observability/
│   ├── config/
│   └── testing/
├── assets/
├── app.config.ts
└── package.json
```

`app/` 文件保持薄，只解析路由参数并渲染 feature screen。复杂逻辑放入 `src/features`。

---

## 4. Feature 模块约束

每个 feature 推荐：

```text
features/generation/
├── screens/
├── components/
├── hooks/
├── use-cases/
├── queries/
├── state/
├── schemas/
├── mappers/
├── __tests__/
└── index.ts
```

模块通过公共 `index.ts` 暴露最小 API。禁止跨 feature 深层导入内部文件。共享组件只有在两处以上且语义稳定时才上移，避免过早创建“万能组件”。

---

## 5. 路由与导航

使用 Expo Router 文件路由，但业务导航通过 typed helper 封装。

### 5.1 路由组

- `(tabs)`：首页、历史、收藏、我的；
- modal：生成条件、筛选、反馈；
- stack：菜谱详情、烹饪模式；
- auth：登录/升级，不阻塞 guest 核心体验；
- system：隐私、用户协议、错误详情。

### 5.2 路由参数

- 只传稳定 ID 和轻量筛选条件；
- 不把完整 Recipe JSON 放 URL；
- 参数使用 Zod 校验；
- recipeId 不存在时显示受控 Not Found；
- deep link 必须重新检查身份和访问权限；
- cooking route 恢复本地 session，而不是仅依赖页面内 state。

---

## 6. 启动流程

```text
Load build config
→ Initialize redacted logger
→ Read secure session
→ Open/migrate local database
→ Resolve user namespace
→ Hydrate essential preferences
→ Configure API client and query cache
→ Process pending deep link
→ Render app shell
```

启动不能因为监控、分析或非关键缓存失败而永久白屏。数据库迁移或身份损坏需要受控恢复页面，禁止静默清库。

---

## 7. API Client

统一 API Client 负责：

- base URL 和环境；
- Authorization；
- X-Request-Id；
- Idempotency-Key；
- 超时和取消；
- JSON parse；
- Envelope 与 Zod 校验；
- 统一错误映射；
- 安全日志脱敏；
- 网络状态判断。

页面不得直接 `fetch()`。API Client 不做无限重试；生成请求只通过幂等和状态恢复重试。

---

## 8. Repository

```ts
interface RecipeRepository {
  generate(input: GenerationInput, idempotencyKey: string): Promise<GenerationResult>;
  getById(recipeId: string): Promise<Recipe>;
  listHistory(cursor?: string): Promise<RecipePage>;
  saveLocalSnapshot(recipe: Recipe): Promise<void>;
  delete(recipeId: string): Promise<void>;
}
```

Repository 组合 Remote 和 Local source，屏蔽 DTO、数据库 row 与 Domain model 的差异。Mapper 必须显式处理 Schema 版本和缺失字段。

---

## 9. 生成流程

客户端状态机：

```text
idle → validating → submitting → waiting
→ completed | blocked | failed | cancelled | recovering
```

关键规则：

- 点击生成立即禁用；
- 每次用户意图创建一个 idempotencyKey；
- App 超时不立即创建新 Key；
- 网络恢复后使用 requestId 查询状态；
- 用户明确修改输入并重新生成才创建新 Key；
- Candidate 不在客户端展示；
- 只有 Final Recipe 响应通过共享 Schema 后保存和导航；
- `UNSAFE_RECIPE_BLOCKED` 不展示危险候选全文。

---

## 10. 错误模型

UI 不直接展示服务端原始错误。映射为：

```ts
interface AppError {
  kind: 'validation'|'auth'|'network'|'timeout'|'rate_limit'|'safety'|'server'|'local_data'|'unknown';
  code: string;
  userMessageKey: string;
  retryable: boolean;
  requestId?: string;
  fieldErrors?: Record<string,string>;
  cause?: unknown; // 仅内部，不进入普通日志
}
```

每个页面有明确恢复动作：修改输入、重新登录、恢复请求、重新加载、反馈 requestId。禁止所有错误都显示“网络异常”。

---

## 11. 身份与命名空间

本地数据 key 使用：

```text
namespace = environment + subjectType + subjectId
```

- guest、anonymous、registered 分开；
- 切换账号先暂停同步，再切 namespace；
- Query cache key 包含 subject；
- 登出撤销 Token 并清理敏感缓存；
- guest 数据合并必须用户确认；
- 不能根据客户端传入 ownerId 请求别人的数据。

---

## 12. 本地优先边界

本地是以下数据的主状态：

- 生成条件草稿；
- 当前食材选择；
- 烹饪 session；
- 未登录最近 Recipe；
- 离线队列。

服务端是以下数据的权威来源：

- 账户、云端 Recipe、收藏；
- 可信 safety status；
- 规则和营养 assessment；
- 请求计费和状态。

客户端缓存不能把 revoked Recipe 恢复为安全。

---

## 13. 烹饪模式

- session 独立于页面生命周期；
- 计时器保存 `startedAt/duration/pausedAt`，不依赖 setInterval 累加；
- 每次前台恢复按当前时间重算；
- App 被回收后从本地数据库恢复；
- 屏幕常亮按页面启停并在卸载恢复；
- 通知是增强能力，权限拒绝不阻塞基础计时；
- 系统时间异常变化产生提示和审计；
- 完成步骤和 Recipe 不互相覆盖。

---

## 14. Design System 接入

所有页面使用 token：颜色、字体、间距、圆角、阴影、motion。安全提示使用语义组件，不允许页面自行选择红色即代表 BLOCK。详细规则见 `15_UI_UX_SYSTEM.md`。

---

## 15. 性能

- 列表使用虚拟化和稳定 key；
- Recipe 大 JSON 进入本地数据库，不长期塞入全局 state；
- 图片后续引入时使用尺寸和缓存策略；
- Query 选择性订阅，避免整个 App 重渲染；
- 首屏不等待全部历史和非关键配置；
- 监控 JS/Native 启动、TTI、列表卡顿和 API P95；
- 性能优化必须基于测量，不以牺牲正确性换取。

---

## 16. 安全

- App 包不含 AI Key、Service Role Key；
- Secret 不进入 `EXPO_PUBLIC_*`；
- Token 使用 SecureStore；
- deep link 输入校验；
- 外部 URL allowlist；
- WebView 首版不用于核心内容；
- 日志脱敏；
- 敏感页面截图策略按发布需求评估；
- root/jailbreak 检测不是身份安全基础；
- 后端始终重新授权和校验。

---

## 17. 测试边界

- Domain/Use Case：纯单元测试；
- Mapper/API：契约测试；
- Screen：组件和交互测试；
- Repository：本地/远端集成测试；
- 核心流程：E2E；
- Android 真机：发布门禁；
- iOS：P2 前建立兼容矩阵。

测试策略详见 `18_TEST_STRATEGY.md`。

---

## 18. 依赖规则

允许：

```text
screen → feature hook → use case → repository interface
repository implementation → API/local adapter
```

禁止：

- Domain import React/Expo；
- Screen import Supabase client；
- UI 直接读取 SecureStore；
- Feature A 深入导入 Feature B 内部 state；
- 本地数据库 row 直接作为 UI model；
- 共享包依赖 App；
- 测试通过 monkey patch 绕过正式接口。

可使用 ESLint boundary rule 和 dependency graph CI 检查。

---

## 19. 实施顺序

1. Monorepo、TypeScript、Lint、测试；
2. App shell、路由、Design tokens；
3. 固定 Fixture 的食材→详情流程；
4. API Client 和共享 Schema；
5. 生成状态机；
6. Local DB 与历史；
7. 烹饪 session；
8. Auth namespace；
9. 云同步；
10. 监控和发布能力。

不得第一天同时接入 Auth、AI、数据库和所有页面，否则无法定位问题。

---

## 20. Definition of Done

- [ ] 目录和依赖方向有自动检查；
- [ ] Router 文件保持薄；
- [ ] 页面不直接 fetch/SecureStore/SQL；
- [ ] API 响应经过共享 Schema；
- [ ] 生成幂等和恢复通过测试；
- [ ] 身份 namespace 隔离通过；
- [ ] 烹饪进度被回收后可恢复；
- [ ] 错误状态和 requestId 可用；
- [ ] Android 模拟器和指定真机通过；
- [ ] 文档和回滚说明更新。

---

## 21. 当前结论

客户端采用“薄路由、Feature 模块、Application Use Case、Domain、Repository/Adapter”的结构。Expo 提供平台能力，但不成为业务架构。任何快速实现都必须保留 API、身份、数据和食品安全边界，不能把全部逻辑堆进页面组件。
