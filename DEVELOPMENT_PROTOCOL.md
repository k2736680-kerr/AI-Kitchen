# Development Protocol — 开发宪法

> 本文规定 AI Kitchen 项目所有代码、文档、数据库、AI、测试和发布工作的强制执行方式。任何速度优化不得以牺牲安全、可追溯性和可回滚性为代价。

| 属性 | 内容 |
|---|---|
| 文档级别 | 最高工程规范 |
| 适用范围 | 产品、设计、移动端、后端、数据库、AI、测试、运维、发布 |
| 当前版本 | 1.0 |
| 最后更新 | 2026-07-24 |

---

## 1. 核心原则

工程决策按以下优先级排序：

1. 用户安全与数据安全；
2. 正确性和可验证性；
3. 可回滚性；
4. 可维护性；
5. 用户体验；
6. 性能和成本；
7. 开发速度；
8. 技术新颖性。

当“更快上线”和“安全校验完整”冲突时，选择安全校验；当“代码更少”和“职责清晰”冲突时，选择职责清晰；当“模型更聪明”和“规则可验证”冲突时，选择可验证规则。

---

## 2. 事实来源与状态管理

### 2.1 禁止计划冒充事实

项目状态只允许使用以下标签：

- `NOT_STARTED`：尚未开始；
- `IN_PROGRESS`：已经开始但未达到验收；
- `BLOCKED`：因明确原因无法继续；
- `READY_FOR_REVIEW`：实现完成，等待审核或验收；
- `DONE`：所有完成定义已满足；
- `DEPRECATED`：已弃用但可能仍存在；
- `REMOVED`：已删除并完成迁移或清理。

文档中的“目标架构”“计划交付”和“当前实现”必须明确分开。

### 2.2 状态文档职责

- `PROJECT_STATE.md`：记录阶段性稳定事实；
- `CURRENT_STATUS.md`：记录当前工作和最近验证；
- `CHANGELOG.md`：记录已发生变化；
- `DECISIONS.md`：记录为何做出关键选择。

完成一次任务后至少更新 `CURRENT_STATUS.md`；影响版本或用户行为时更新 `CHANGELOG.md`；改变架构或长期边界时更新 `DECISIONS.md`。

---

## 3. 单任务工作流

### 3.1 任务输入

每个任务必须尽量包含：

```markdown
任务名称：
业务目标：
当前现状：
允许修改：
禁止修改：
输入或完整报错：
验收标准：
测试命令：
目标环境：
回滚方式：
```

若信息不完整但可以通过现有仓库判断，AI 应先检查仓库，不应重复询问。只有缺失信息会实质改变实现方向时才需要澄清。

### 3.2 开始前检查

- 工作树是否干净；
- 当前分支是否正确；
- 最近可运行 commit 是否记录；
- 依赖是否已安装且锁文件存在；
- 环境变量是否通过示例文件说明；
- 当前测试基线是否通过；
- 是否涉及破坏性数据库操作；
- 是否触发正式架构决策。

### 3.3 实现步骤

1. 读取相关文档和代码；
2. 复现现状或错误；
3. 写出最小变更方案；
4. 优先补测试或创建可验证样例；
5. 实现最小范围修改；
6. 运行格式化、类型、单元、集成和必要的手工测试；
7. 检查 Git diff；
8. 更新状态和变更文档；
9. 创建清晰提交；
10. 提供回滚说明。

### 3.4 结束输出

任务结束必须明确：

- 哪些文件真实修改；
- 哪些验收标准已满足；
- 哪些测试真实执行；
- 哪些内容未验证；
- 是否存在数据迁移或兼容风险；
- 如何回滚；
- 下一项最小任务是什么。

---

## 4. Git 规范

### 4.1 分支

推荐：

- `main`：可发布或稳定基线；
- `develop`：可选，若团队确实需要集成分支；
- `feat/<short-name>`：功能；
- `fix/<short-name>`：修复；
- `docs/<short-name>`：文档；
- `chore/<short-name>`：工具或依赖；
- `release/<version>`：发布准备；
- `hotfix/<short-name>`：生产紧急修复。

非专业开发者单人开发初期可采用 `main + 短期功能分支`，避免过度复杂的 Git Flow。

### 4.2 提交格式

采用 Conventional Commits：

```text
feat(mobile): add ingredient selection
fix(api): prevent duplicate generation billing
test(safety): add egg and poultry regression cases
docs(architecture): define provider adapter boundary
refactor(shared): extract recipe validator
chore(deps): upgrade expo sdk in isolated change
```

一个提交只表达一个主要意图。依赖升级不得与业务功能混在同一提交。

### 4.3 禁止操作

- 在未确认备份时重写共享分支历史；
- 将 `.env`、证书、签名文件或密钥提交 Git；
- 删除数据库迁移以掩盖错误；
- 用大规模格式化覆盖真实业务 diff；
- 在无法说明影响范围时合并大型 AI 生成改动。

---

## 5. 代码组织与职责边界

### 5.1 分层原则

```text
UI / Screens
  ↓
Application Hooks / Use Cases
  ↓
Domain Types and Rules
  ↓
Repositories / API Client / Storage Adapters
  ↓
External Services
```

- UI 不直接调用 Supabase 数据库或 AI Provider；
- Screen 不承载复杂业务规则；
- 领域规则不依赖 React Native；
- 外部服务通过适配器访问；
- 共享 Schema 不导入 UI 组件；
- 业务逻辑尽量是可在 Node 环境单测的纯 TypeScript。

### 5.2 模块边界

建议模块：

- `ingredients`：选择、搜索、标准化；
- `generation`：生成请求、状态、幂等；
- `recipes`：详情、历史、收藏；
- `cooking`：步骤、进度、计时器；
- `identity`：guest、anonymous、registered；
- `preferences`：人数、厨具、忌口、过敏；
- `feedback`：问题类型、requestId；
- `safety`：规则、警告和阻断；
- `nutrition`：来源、计算和置信度。

模块之间通过明确接口协作，禁止循环依赖。

---

## 6. TypeScript 规范

- 开启严格模式；
- 不使用无理由的 `any`；
- 外部输入一律视为 `unknown` 后校验；
- 枚举值优先使用字符串联合和 Schema 推导；
- 领域 ID 使用明确类型或命名，避免随意传递普通字符串；
- 时间统一使用 ISO 8601 UTC 存储，界面本地化显示；
- 金额和 Token 成本不得使用隐含单位；
- 可空、缺失和默认值必须在 Schema 中明确；
- 错误必须归一化为项目错误码，不把第三方异常直接向上泄漏；
- 共享类型优先从 Zod Schema 推导，避免手写重复接口。

示例：

```ts
const GenerateRecipeRequestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  ingredients: z.array(IngredientInputSchema).min(1).max(30),
  servings: z.number().int().min(1).max(12),
  maxTimeMinutes: z.number().int().min(5).max(240),
  idempotencyKey: z.string().uuid(),
});

type GenerateRecipeRequest = z.infer<typeof GenerateRecipeRequestSchema>;
```

---

## 7. API 协议

### 7.1 通用要求

- 版本化路径，例如 `/v1/recipes/generate`；
- 请求包含 `X-Request-Id` 和 `Idempotency-Key`；
- 响应包含 `requestId` 和 `schemaVersion`；
- 使用统一错误结构；
- 所有输入在服务端重新验证；
- 不依赖前端隐藏字段实现安全；
- 对重试行为明确标注 `retryable`；
- 列表使用稳定分页；
- 破坏性变更创建新版本，不静默改变旧语义。

### 7.2 幂等与重复计费

生成请求必须：

- 以用户/匿名身份 + `idempotencyKey` 建立唯一约束；
- 相同 Key 不重复调用模型；
- 并发请求只能有一个获得执行权；
- 客户端提交后禁用按钮；
- 数据库短暂失败时不能盲目重新生成；
- 返回现有请求状态，而非创建新账单。

---

## 8. 数据库协议

### 8.1 迁移

- 所有结构变化通过版本化迁移；
- 迁移必须可在空库执行；
- 重要迁移应在 staging 使用接近生产的数据量验证；
- 不直接修改已执行的共享迁移；
- 删除字段采用“新增替代 → 双写/回填 → 切读 → 删除”的兼容流程；
- 迁移与代码发布顺序必须记录。

### 8.2 所有权和 RLS

- 用户表包含 `owner_id`；
- `owner_id` 必须与 `auth.uid()` 比较；
- RLS 默认拒绝；
- 每张用户数据表必须有跨用户越权测试；
- Service Role 仅服务端使用；
- 管理操作通过受控函数或后台工具，不在移动端实现；
- 软删除与账户删除必须区分。

### 8.3 索引

索引依据真实查询建立，不因“可能有用”随意添加。每个索引要回答：

- 支持哪条查询；
- 选择性如何；
- 是否与 RLS 条件匹配；
- 写入成本如何；
- 是否可用联合索引替代多个单列索引；
- 如何通过查询计划验证。

---

## 9. AI 工程协议

### 9.1 生成流水线

```text
Normalize Input
→ Input Safety Precheck
→ Build Prompt
→ Call Provider
→ Parse JSON
→ Validate Schema
→ Validate Business Rules
→ Validate Food Safety Rules
→ Calculate/Attach Nutrition
→ Persist Result and Trace
→ Return Typed Response
```

任何步骤失败都必须产生可追踪状态和项目错误码。

### 9.2 Prompt 管理

Prompt 必须：

- 存在版本号；
- 与模型和 Schema 版本绑定；
- 通过代码模板构建，不在多处复制长字符串；
- 用户输入作为数据边界插入；
- 明确禁止改变系统规则和输出格式；
- 变更前后运行固定评估集；
- 记录成功率、格式失败率、成本和延迟；
- 支持回滚。

### 9.3 Provider Adapter

统一接口至少支持：

- 超时；
- 取消；
- 结构化输出；
- Token/成本用量；
- 供应商错误归一化；
- Mock；
- 配置切换；
- 日志脱敏。

业务层不得引用具体供应商 SDK 类型。

---

## 10. 食品安全协议

### 10.1 优先级

```text
过敏/禁忌阻断 > 非食用物阻断 > 高风险食品处理 > 业务合理性 > 创意和口味
```

### 10.2 规则等级

- `BLOCK`：不展示候选结果，可重新生成；
- `WARN`：可展示，但必须有不依赖颜色的醒目警告；
- `INFO`：一般储存、卫生或烹饪提示。

### 10.3 规则发布

每条高风险规则至少包含：

- 标准食材或风险类别；
- 触发条件；
- 严重程度；
- 是否阻断；
- 用户提示；
- 来源；
- 地区；
- 版本；
- 生效时间；
- 测试用例。

安全规则服务异常时不得返回未校验结果。

---

## 11. 测试协议

### 11.1 测试层级

| 层级 | 必测对象 |
|---|---|
| 单元测试 | Schema、纯函数、规则、转换、营养计算 |
| 集成测试 | Edge Function、数据库、Auth、模型 Mock |
| 契约测试 | App 请求与 API 响应的一致性 |
| UI 测试 | 核心页面、加载、空、失败、重试 |
| AI 评估 | 固定输入集、结构、约束、安全和成本 |
| 安全测试 | RLS、密钥、限流、注入、越权 |
| 真机测试 | Android/iOS 主要流程、后台、网络切换 |

### 11.2 最低门禁

每个 Pull Request 或任务至少运行：

```text
format/check
lint
typecheck
unit tests
changed-module integration tests
```

涉及数据库、API、AI、安全或移动端主流程时增加相应专项测试。

### 11.3 AI 固定测试分类

- 常见家常食材；
- 单食材和极少食材；
- 少厨具；
- 极短时间；
- 过敏和忌口；
- 危险非食物；
- 乱码、超长和 Prompt 注入；
- 模型非 JSON；
- 缺字段、重复步骤和时间矛盾；
- 供应商超时和部分故障。

模型、Prompt、Schema 或安全规则变化后必须重跑。

---

## 12. UI 与可访问性协议

- 异步页面必须有加载、成功、空、失败和重试；
- 危险提示不得只使用颜色；
- 未选择食材时生成按钮禁用并解释原因；
- 生成中防止重复提交；
- 返回页面后保留用户输入；
- 菜谱字段缺失不得导致页面崩溃；
- 烹饪模式支持大字体和清晰的下一步；
- 触控目标保持合理尺寸；
- 文案不做医疗承诺；
- 用户错误、网络错误、限流、模型错误和安全阻断使用不同提示。

---

## 13. 安全与秘密管理

- `.env.example` 只包含变量名和无敏感示例；
- 开发、staging、production 使用独立项目和密钥；
- 秘密通过平台 Secrets 管理；
- 构建产物扫描高权限 Key；
- Git 提交启用密钥扫描；
- 日志中 Token、邮箱和敏感字段脱敏；
- 崩溃上报前清洗请求内容；
- 生产数据不得复制到开发环境；
- 本地调试截图不得包含真实敏感数据。

发现密钥泄漏时：立即吊销 → 创建新密钥 → 检查日志和使用记录 → 清理仓库历史 → 记录事故和预防措施。

---

## 14. 依赖与升级

- 使用锁文件并提交；
- 不在功能开发中顺便升级 Expo SDK；
- 依赖升级独立提交；
- 升级前阅读迁移说明；
- 在 development 和 staging 回归；
- 同类库只保留一个主要选择；
- 引入原生依赖前评估 Expo Development Build、EAS 和 iOS/Android 兼容；
- 无维护、许可证不明或体积过大的依赖不得直接引入。

---

## 15. 可观测性与错误处理

每次生成至少记录：

- `requestId`；
- 匿名或用户主体的不可逆内部标识；
- provider、model、promptVersion、schemaVersion、ruleVersion；
- 各阶段耗时；
- Token 和估算成本；
- 重试次数；
- 最终状态和错误码；
- 安全规则结果；
- 不含敏感原文的诊断信息。

用户界面错误必须可操作，例如修改输入、稍后重试、重新登录或提交带 `requestId` 的反馈。

---

## 16. 发布协议

### 16.1 禁止发布条件

存在以下任一项不得上线：

- 数据越权；
- 密钥进入 App 或仓库；
- 过敏约束可稳定绕过；
- 安全校验异常仍展示结果；
- 主要流程阻断或高频崩溃；
- 无法删除账户或隐私说明与实际不一致；
- 生成没有限流和成本上限；
- production 无回滚方式；
- 数据库迁移未经 staging 验证；
- App 签名、版本或商店材料错误。

### 16.2 发布顺序

1. 本地和模拟器；
2. 开发包；
3. staging 内测；
4. Google Play 封闭测试；
5. Android 小范围发布；
6. 稳定后 iOS 内测和发布；
7. 逐步扩大地区和用户。

---

## 17. 回滚协议

每个高风险变更必须说明：

- 代码如何回退；
- Feature Flag 如何关闭；
- 数据库是否向后兼容；
- 旧 App 是否仍能访问新 API；
- Prompt/模型如何切回；
- 是否保留上一版本构建包；
- 回滚后如何验证。

无法回滚的迁移必须在实施前经过单独评审。

---

## 18. Definition of Done

任务标记 `DONE` 的最低条件：

- 验收标准逐项满足；
- 实际测试通过且结果已记录；
- 主路径和失败路径可验证；
- 代码、Schema、迁移和文档保持一致；
- 安全和隐私边界未被破坏；
- `CURRENT_STATUS.md` 已更新；
- 用户可知道如何运行和验证；
- 有可定位 commit 和回滚方式。
