# 08 — Rule Engine

> 本文定义 AI Kitchen 的确定性规则执行体系。Rule Engine 是“候选内容能否成为产品结果”的程序化决策层，不是 Prompt 的补充说明，也不是散落在页面、Edge Function 和 SQL 中的条件集合。

| 属性 | 内容 |
|---|---|
| 文档状态 | Draft / Ready for Review |
| 设计范围 | Business Rules、Food Safety 调度、营养前置校验、结果聚合与审计 |
| 依赖文档 | `03_DATABASE_DESIGN.md`、`04_API_CONTRACT.md`、`06_AI_ENGINE.md`、`10_RECIPE_SCHEMA.md` |
| 实施状态 | 尚未创建规则包、规则表或执行服务 |
| 最后更新 | 2026-07-27 |

---

## 1. 目标与非目标

### 1.1 目标

Rule Engine 必须做到：

- 对相同标准化输入、相同规则版本产生可重复结果；
- 将“业务限制”“食品安全”“数据完整性”“营养可计算性”分层执行；
- 允许规则版本化、灰度、撤回、回放和审计；
- 输出结构化 findings，而不是只抛出布尔值或自然语言；
- 明确 BLOCK、WARN、INFO、TRANSFORM 等不同动作；
- 将模型从最终放行决策中移除；
- 在规则不可用时按风险类别执行不同降级策略；
- 支持离线固定测试集和生产历史回放。

### 1.2 非目标

Rule Engine 不负责：

- 生成菜谱创意；
- 决定用户身份和数据所有权；
- 直接调用数据库绕过 Repository；
- 替代 JSON Schema/Zod 的基础类型校验；
- 以模型判断替代食品安全规则；
- 在客户端保存可被篡改的可信放行状态；
- 在运行时执行任意用户上传代码。

---

## 2. 为什么规则不能散落

将规则分别写在 Prompt、React 页面、Edge Function、SQL Trigger 和数据库约束中，短期看起来简单，长期会产生五类失控：

1. **同一规则多份实现**：页面禁止某食材，但 API 未禁止；
2. **执行顺序不确定**：营养计算先于标准化，导致重复或漏算；
3. **无法审计**：无法回答某个 requestId 当时使用了哪一版规则；
4. **无法回放**：规则更新后不能评估历史结果会如何变化；
5. **错误降级**：安全规则异常时被通用 catch 吞掉并继续展示。

因此采用“集中编排、分域实现、结构化结果、版本化规则集”的体系。数据库约束仍负责数据完整性，UI 仍可做即时提示，但它们不能成为唯一业务事实。

---

## 3. 规则域划分

| 规则域 | 作用 | 典型结果 | 不可用时策略 |
|---|---|---|---|
| Schema Invariants | 类型与结构不变量 | BLOCK | 请求失败 |
| Input Eligibility | 输入是否可进入生成 | BLOCK/WARN | 请求失败或提示修改 |
| Business Constraints | 时间、厨具、份量、缺失食材 | BLOCK/WARN/TRANSFORM | 失败或保守返回 |
| Food Safety | 过敏、非食用物、加热、储存风险 | BLOCK/WARN/INFO | **失败关闭** |
| Nutrition Preconditions | 标准 ID、克重、单位可换算 | WARN/INFO | 营养降级，不阻断菜谱 |
| Presentation Policy | 提示去重、排序、文案选择 | TRANSFORM | 使用安全默认值 |

`09_FOOD_SAFETY_RULES.md` 定义安全规则本身；本文件定义它们如何被执行、组合和追踪。

---

## 4. 执行位置与包边界

推荐 Monorepo：

```text
packages/domain/
└── src/rules/
    ├── engine.ts
    ├── types.ts
    ├── registry.ts
    ├── facts/
    ├── business/
    ├── safety-adapter/
    ├── nutrition-preconditions/
    ├── aggregation/
    └── testing/
```

核心纯函数包必须：

- 不依赖 React Native；
- 不直接读取 Supabase；
- 不直接读取环境变量；
- 接收完整 `RuleExecutionContext`；
- 返回 `RuleExecutionReport`；
- 可在 Edge Function、测试脚本和离线回放工具中运行。

数据库 Repository 负责加载规则集和事实，Rule Engine 只执行。

---

## 5. 事实模型

规则不应自行到处查询数据。进入引擎前，由 Facts Builder 创建不可变事实快照：

```ts
export type RuleExecutionContext = {
  requestId: string;
  now: string;
  locale: string;
  region: string;
  environment: 'development' | 'staging' | 'production';
  recipeCandidate: RecipeCandidate;
  normalizedInput: NormalizedGenerationInput;
  ingredientFacts: IngredientFact[];
  userConstraints: UserConstraintFacts;
  applianceFacts: ApplianceFacts;
  ruleSetVersions: {
    business: string;
    foodSafety: string;
    nutrition: string;
  };
};
```

### 5.1 事实的要求

- 标准食材必须含 canonical code 和匹配置信度；
- 用户原始显示名可以保留，但不能作为唯一规则键；
- 不确定事实必须显式标记 `unknown`，不能默认为安全；
- 时间、地区、用户约束在一次执行中保持稳定；
- 不把 Access Token、邮箱或设备标识放入规则上下文；
- 所有派生事实应可说明来源和转换版本。

---

## 6. 规则定义模型

```ts
export type RuleSeverity = 'block' | 'warn' | 'info';
export type RuleAction = 'reject' | 'regenerate' | 'transform' | 'annotate' | 'none';

export interface RuleDefinition<TContext = RuleExecutionContext> {
  id: string;
  domain: 'business' | 'food_safety' | 'nutrition_precondition' | 'presentation';
  version: string;
  priority: number;
  enabled: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  applies(context: TContext): boolean;
  evaluate(context: TContext): RuleFinding[];
}

export interface RuleFinding {
  findingId: string;
  ruleId: string;
  ruleVersion: string;
  domain: string;
  severity: RuleSeverity;
  action: RuleAction;
  code: string;
  path?: string;
  ingredientCodes?: string[];
  stepNumbers?: number[];
  messageKey: string;
  messageParams?: Record<string, string | number>;
  evidence: RuleEvidence[];
  blocking: boolean;
}
```

自然语言文案不作为规则唯一结果。规则返回 `messageKey + params`，客户端或服务端展示层进行本地化，避免规则更新与文案更新互相绑死。

---

## 7. 规则实现类型

### 7.1 代码规则

适用于：

- 跨字段复杂判断；
- 需要严格类型和测试的高风险逻辑；
- 计算逻辑；
- 不能安全表达为配置的规则。

代码规则必须经过代码评审和发布流程，不允许后台直接编辑。

### 7.2 配置规则

适用于：

- 食材代码名单；
- 简单阈值；
- 地区生效范围；
- 警告文案键；
- 启停和有效期。

配置必须通过受限 Schema，禁止存储任意表达式或 JavaScript。后台修改配置仍需要审计、staging 回放和审批。

### 7.3 数据库约束

适用于：

- 唯一性；
- 外键；
- 非空；
- 枚举范围；
- 所有权完整性。

数据库约束不是业务 Rule Engine 的替代，但作为最后一道数据完整性防线。

### 7.4 Prompt 指令

Prompt 可以降低候选错误率，例如要求“不加入用户过敏原”，但 Prompt 指令不是可信规则。模型违反时仍由确定性规则拦截。

---

## 8. 执行流水线

```text
Candidate Schema Valid
  → Build Facts
  → Input/Business Rules
  → Canonical Ingredient Mapping Verification
  → Food Safety Rules
  → Nutrition Preconditions
  → Transformations
  → Deduplicate & Aggregate Findings
  → Final Gate
  → Final Recipe Assembly
```

### 8.1 阶段一：Preflight

检查规则版本是否可用、事实是否完整、关键标准食材映射是否存在。Food Safety 所需关键事实缺失时，不得跳过。

### 8.2 阶段二：Business Rules

检查：

- 总时间是否超过最大时间；
- 候选步骤是否要求用户未提供且未允许的关键厨具；
- 份量是否合理；
- 缺少食材是否明确；
- 用户忌口是否被加入；
- 步骤序号和引用是否一致；
- 转换后用量是否仍在合理范围。

### 8.3 阶段三：Food Safety

安全域独立执行，并可在发现确定性 BLOCK 时短路后续非必要计算。安全规则服务或规则集缺失时返回 `RULE_ENGINE_SAFETY_UNAVAILABLE`，AI Engine 将请求标记为 failed/blocked，不展示候选。

### 8.4 阶段四：Nutrition Preconditions

只判断是否具备可靠计算条件，不负责最终营养值。失败可使 `nutrition.source = unavailable`，但不能伪造数值。

### 8.5 阶段五：Final Gate

最终门控只能依据结构化结果：

```ts
const canPublish =
  schemaValid &&
  !findings.some(f => f.blocking) &&
  foodSafetyReport.status === 'passed';
```

模型输出中的 `safe: true`、`confidence: high` 或自然语言声明不参与门控。

---

## 9. 优先级、冲突与短路

### 9.1 优先级

建议数值越小越先执行：

- 0–99：引擎与关键事实；
- 100–199：过敏和非食用物 BLOCK；
- 200–299：其他食品安全；
- 300–399：用户硬约束；
- 400–499：可执行性；
- 500–599：营养前置；
- 900+：展示整理。

### 9.2 冲突解决

- BLOCK 永远高于 WARN/INFO；
- 更具体规则高于通用规则，但不能降低安全严重度；
- 同一事实上的多个 WARN 可合并，保留所有 ruleId；
- TRANSFORM 不得消除已有 BLOCK 证据；
- 配置规则不得覆盖代码级强制 BLOCK；
- 规则冲突必须产生审计事件，而不是静默选择。

### 9.3 短路

只允许在以下场景短路：

- 发现明确非食用物；
- 发现明确过敏原且用户声明为过敏；
- Food Safety 规则集无法加载；
- Candidate 结构不合法；
- 核心事实损坏。

即使短路，也必须返回已经产生的 findings 和引擎错误信息，便于诊断。

---

## 10. 转换规则边界

可允许的确定性转换：

- 统一单位；
- 标准化空格和标点；
- 计算步骤编号；
- 将可推导的总时间与分步时间对齐并标记来源；
- 将重复提示合并；
- 将缺少食材从候选食材中显式拆分。

禁止的转换：

- 自动删除过敏原后继续声称原菜谱安全；
- 擅自替换会改变主要烹饪风险的食材；
- 根据模型文本猜测加热温度；
- 在无法匹配营养数据时编造克重或营养值；
- 修改用户人数、最大时间和硬性厨具约束。

需要创意重写时，应重新生成 Candidate，而不是让规则引擎变成第二个生成模型。

---

## 11. 版本与 Registry

每次执行必须锁定版本：

```json
{
  "businessRuleSetVersion": "business.v1.0.0",
  "foodSafetyRuleSetVersion": "food-safety.sg.v1.0.0",
  "nutritionRuleSetVersion": "nutrition.v1.0.0",
  "engineVersion": "rule-engine.v1.0.0"
}
```

规则集版本不可在同一次请求中途变化。生产 Registry 至少保存：

- version；
- checksum；
- status：draft/staging/active/retired/revoked；
- region；
- effective interval；
- source references；
- approval record；
- evaluation report；
- rollback target。

高风险规则被撤回时，不能只设置 `enabled=false`；必须记录 revoke 原因，并评估已经发布的菜谱是否需要标记、隐藏或通知用户。

---

## 12. 执行报告

```ts
export interface RuleExecutionReport {
  requestId: string;
  engineVersion: string;
  startedAt: string;
  completedAt: string;
  status: 'passed' | 'blocked' | 'failed';
  findings: RuleFinding[];
  executedRules: Array<{ id: string; version: string; durationMs: number }>;
  skippedRules: Array<{ id: string; reason: string }>;
  ruleSetVersions: Record<string, string>;
  metrics: {
    evaluatedCount: number;
    findingCount: number;
    blockCount: number;
    warnCount: number;
  };
}
```

报告进入 generation request 的可追踪元数据。不得将完整用户敏感输入复制进报告；证据使用标准代码、路径、摘要和受控枚举。

---

## 13. 错误与降级

| 错误 | API/生成状态 | 是否展示 Candidate | 行为 |
|---|---|---|---|
| `RULE_CONTEXT_INVALID` | failed | 否 | 修复事实构建或重新生成 |
| `BUSINESS_RULES_UNAVAILABLE` | failed/retryable | 否 | 有限重试 |
| `FOOD_SAFETY_RULES_UNAVAILABLE` | blocked/failed | **否** | 失败关闭 |
| `NUTRITION_RULES_UNAVAILABLE` | completed with nutrition unavailable | 是 | 结构化降级 |
| `RULE_CONFLICT_DETECTED` | failed | 否 | 告警并回滚规则集 |
| `RULE_TIMEOUT` | failed | 否 | 按域决定重试；安全域不得跳过 |

不得使用“任何规则异常都忽略并继续”的通用降级。

---

## 14. 数据库与审计

推荐实体：

- `rule_sets`：版本、状态、范围、checksum；
- `rule_definitions`：受控配置；
- `rule_deployments`：环境和生效时间；
- `rule_evaluation_runs`：离线评估；
- `recipe_rule_findings`：最终 Recipe 的结构化 findings；
- `rule_audit_log`：创建、批准、启用、撤回。

代码规则本体保存在 Git，数据库保存版本引用和配置。生产变更必须能关联 Git commit、审批人、评估报告和部署批次。

---

## 15. 测试策略

### 15.1 单元测试

每条规则至少覆盖：命中、不命中、边界值、未知事实、地区差异、禁用状态和错误输入。

### 15.2 规则组合测试

必须覆盖：

- 一个候选同时触发多个域；
- BLOCK + WARN 冲突；
- 通用规则与具体规则重叠；
- TRANSFORM 后再次校验；
- 规则集缺失；
- 同一请求重复执行结果一致。

### 15.3 Golden Cases

固定测试集保存：输入、Candidate、事实、规则版本、期望 findings 和最终状态。不得只断言自然语言文案。

### 15.4 历史回放

规则升级前，对脱敏历史 Candidate 或标准测试集回放，比较：

- 新增 BLOCK；
- BLOCK 被移除；
- WARN 数量变化；
- 假阳性；
- 执行耗时；
- 地区差异；
- 需要撤回的既有 Recipe。

### 15.5 性质测试

建议加入：

- 相同输入和版本得到相同输出；
- 添加一个明确过敏原不能降低严重度；
- 删除非关键 INFO 不应改变 canPublish；
- 规则排序变化不应改变聚合后的语义结果；
- 未知安全事实不能被当作 passed。

---

## 16. 发布与灰度

规则集发布顺序：

```text
Draft → Static Validation → Unit/Golden Tests → Staging Replay
→ Human Review → Limited Production Shadow → Active → Monitor
```

安全规则通常不做“让一部分用户不受规则保护”的 A/B。可使用 shadow 比较，但正式展示始终使用当前已批准安全规则。非安全业务规则可以按稳定 subject hash 灰度，但必须记录 cohort。

### 16.1 回滚条件

- BLOCK 数量异常下降；
- 已知危险测试被放行；
- 假阳性超过门限；
- 冲突或执行错误激增；
- P95 明显恶化；
- 地区规则错误生效。

回滚不仅切换 active 版本，还要停止相关缓存、标记受影响结果并启动复盘。

---

## 17. 可观测性

最少指标：

- 规则执行成功率；
- 各域耗时 P50/P95；
- BLOCK/WARN/INFO 数量；
- 每条 ruleId 命中率；
- 未知事实率；
- 规则冲突率；
- 规则版本分布；
- 重新生成成功率；
- 用户对规则结果的反馈率。

日志必须包含 requestId、engineVersion、ruleSetVersion、finding codes，不包含完整过敏描述和原始模型全文。

---

## 18. 实施顺序

1. 定义 Rule types 和纯函数 Engine；
2. 实现 Business Rule 基础集；
3. 实现 Finding Aggregator；
4. 建立 Food Safety Adapter；
5. 建立 Nutrition Preconditions；
6. 将 Rule Report 接入 AI Engine；
7. 建立固定测试集；
8. 建立 Registry 和版本加载；
9. 接入生产审计与指标；
10. 最后再考虑管理后台。

P0 可以把批准规则以代码和静态数据随服务端发布，但必须保留版本号和 checksum；不能因为没有后台而取消版本化。

---

## 19. Definition of Done

实现 Rule Engine 只有在以下全部满足时才可称为完成：

- [ ] Engine 是可单测的纯领域包；
- [ ] Candidate 与 Final Recipe 门控明确；
- [ ] Food Safety 不可用时失败关闭；
- [ ] 营养不可用时只降级营养；
- [ ] 每次执行记录版本和 report；
- [ ] BLOCK/WARN/INFO/TRANSFORM 行为有契约测试；
- [ ] 规则冲突可检测且不静默；
- [ ] 固定危险测试无放行；
- [ ] 历史回放工具可执行；
- [ ] 发布和回滚流程在 staging 验证；
- [ ] 文档、CHANGELOG、DECISIONS 已更新。

---

## 20. 当前结论

AI Kitchen 采用集中编排、分域实现、结构化 finding、版本化 Registry 的规则体系。Prompt 负责降低错误概率，Schema 负责结构，Rule Engine 负责确定性产品约束，Food Safety 负责安全门控，Nutrition Engine 负责可解释估算。任何实现都不得把这些职责重新混成一段 Edge Function 条件或一个“让模型自检”的提示词。
