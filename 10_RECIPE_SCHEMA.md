# 10 — Recipe Schema

> AI Kitchen 菜谱领域对象、共享类型、结构化输出与版本兼容基线。本文定义 App、API、数据库、AI Engine、规则引擎、营养引擎、测试和历史快照共同使用的 Recipe 语义。任何模型输出、接口 DTO 或数据库快照，只有满足本文约束后才能被视为可展示菜谱。

| 属性 | 内容 |
|---|---|
| 文档版本 | 1.0.0 |
| 状态 | Draft / Ready for Review |
| 默认 Schema | `recipe.v1.0.0` |
| 实现建议 | TypeScript + Zod，按需导出 JSON Schema |
| 适用阶段 | P0–P2 |
| 最后更新 | 2026-07-27 |
| 实施状态 | 尚未创建共享 Schema 代码或迁移 |

---

## 1. 文档目标

Recipe Schema 不是“让模型输出 JSON 的模板”，而是整个产品对“什么叫一份可用菜谱”的正式定义。它需要解决：

1. 移动端、API、数据库和 AI 不再各自维护一套字段；
2. 模型输出不稳定时，系统可以明确指出失败发生在哪个字段；
3. 历史菜谱即使经历字段升级，仍能被还原和展示；
4. 食品安全、过敏、厨具、时间和份量约束可以被程序验证；
5. 营养值的来源、置信度和估算状态不会被隐藏；
6. 新增字段可以向后兼容，破坏性变更有迁移和回滚路径；
7. 测试可以围绕统一对象建立固定样例、边界和属性测试。

本文描述目标契约，不代表代码已经实现。共享包、API 映射、数据库快照和客户端渲染全部通过测试后，才能把状态改为 `IMPLEMENTED`。

---

## 2. 上游约束

本文继承以下决策和文档：

- `D-004`：App、服务端和测试共享 Schema；
- `D-006`：AI 输出必须经过语法、Schema、业务和食品安全四层校验；
- `D-008`：食品安全校验失败关闭；
- `D-009`：标准食材 ID 与别名分离；
- `D-013`：`requestId` 与 `idempotencyKey` 全链路使用；
- `D-014`：规范化关系表与 Recipe Snapshot 并存；
- `03_DATABASE_DESIGN.md`：菜谱、食材、步骤、营养和快照的持久化边界；
- `04_API_CONTRACT.md`：Recipe DTO、Envelope 和接口版本边界；
- `05_AUTH_AND_IDENTITY.md`：所有权来自可信身份，不由 Recipe 字段授权。

Recipe Schema 不负责鉴权、HTTP 状态码、RLS、模型供应商错误和页面布局；这些职责由相应模块处理，但必须以本文对象为共同语言。

---

## 3. 为什么不能只保存模型原始 JSON

把模型原始 JSON 直接当成正式菜谱，会导致字段名随 Prompt 变化、数字类型不稳定、步骤编号重复、食材名称不一致、过敏原无法可靠关联、营养来源被伪造，以及历史记录无法稳定展示。

系统必须区分：

```text
Raw Provider Output
  != Parsed Candidate
  != Validated Recipe Domain Object
  != Published Recipe Snapshot
```

只有经过服务端正式校验和组装的对象，才可以保存、展示或进入烹饪模式。

---

## 4. 单一事实来源与代码位置

推荐目录：

```text
packages/shared/src/recipe/
├── versions/
│   └── recipe-v1.ts
├── enums.ts
├── primitives.ts
├── candidate.ts
├── summary.ts
├── snapshot.ts
├── migrations/
├── fixtures/
└── index.ts
```

规则：

- Zod Schema 是 TypeScript 运行时校验的主来源；
- TypeScript 类型由 Zod 推导，不手写重复 Interface；
- OpenAPI/JSON Schema 通过生成或契约测试保持一致；
- AI Provider 使用正式 Schema 派生出的 Candidate 子集；
- 数据库 Row 通过 Mapper 转换，不直接暴露给 App；
- 任何字段变更先改共享 Schema，再改 API、数据库、Prompt 和 UI。

禁止在 mobile、functions、tests 中各维护一套相似 Recipe 类型。

---

## 5. 版本策略

正式版本格式：

```text
recipe.vMAJOR.MINOR.PATCH
```

| 变化 | 版本 |
|---|---|
| 增加可选字段 | MINOR |
| 放宽向后兼容限制 | MINOR/PATCH |
| 删除字段、改类型、改必填 | MAJOR |
| 改变字段语义 | MAJOR |
| 纯文档修正 | 不改变 Schema 或仅文档 Patch |

兼容原则：

- 服务端不得返回客户端未声明支持的 Major；
- 新增字段优先可选，旧客户端允许忽略；
- 新增枚举值前必须验证客户端不会因穷举失败；
- 历史 Snapshot 保留原 `schemaVersion`；
- 展示旧快照时可以 `migrateForRead()`，但不静默覆写原始数据；
- 破坏性升级必须提供迁移器、Fixtures、灰度和回滚。

---

## 6. 顶层 Recipe 对象

```ts
type Recipe = {
  schemaVersion: "recipe.v1.0.0";
  id: string;
  requestId: string;

  title: string;
  description: string;
  status: "completed" | "blocked" | "withdrawn";

  servings: number;
  difficulty: "easy" | "medium" | "hard";
  cuisineCode: string | null;

  time: RecipeTime;
  ingredients: RecipeIngredient[];
  missingIngredients: MissingIngredient[];
  steps: RecipeStep[];

  nutrition: RecipeNutrition;
  substitutions: RecipeSubstitution[];
  warnings: RecipeWarning[];
  tips: RecipeTip[];

  safety: RecipeSafety;
  provenance: RecipeProvenance;
  createdAt: string;
};
```

说明：

- `completed` 必须已通过所有阻断性校验；
- `blocked` 候选通常不向用户返回完整正文；
- `withdrawn` 表示曾发布但后续因规则、举报或数据问题撤回；
- `ownerId` 不属于公开 Recipe DTO；
- `idempotencyKey` 属于请求生命周期，不进入 Recipe 快照；
- Provider 原始输出、系统 Prompt 和 Token 明细不属于 Recipe。

---

## 7. 基础类型与边界

### 7.1 标识符

- `id`、`requestId`、`stepId` 使用 UUID；
- `ingredientId` 使用数据库稳定 ID，`canonicalCode` 使用可读稳定代码；
- 客户端不得根据 UUID 推断权限或业务含义。

### 7.2 时间

- 绝对时间使用 ISO 8601 UTC；
- 预计耗时使用整数分钟；
- 计时器使用整数秒；
- 模型不得生成服务器时间；
- 未知值使用 `null`，不使用 `-1`。

### 7.3 文本

建议初始上限：

- title：1–80 字符；
- description：1–500 字符；
- step instruction：1–1000 字符；
- 不允许 HTML、脚本、可执行链接或控制字符；
- 正式输出不使用 Markdown 作为结构。

### 7.4 数值

- servings：1–12；
- minutes：0–1440；
- grams：0–100000；
- 不允许 `NaN`、`Infinity` 和字符串数字；
- 营养值允许小数，但必须限定合理范围和精度。

---

## 8. RecipeTime

```ts
type RecipeTime = {
  prepMinutes: number;
  cookMinutes: number;
  passiveMinutes: number;
  totalMinutes: number;
};
```

语义：

- `prepMinutes`：清洗、切配、腌制等主动准备；
- `cookMinutes`：加热、翻炒、烘烤等主动烹饪；
- `passiveMinutes`：静置、冷藏、无需操作的等待；
- `totalMinutes`：从开始到可食用的总历时。

业务不变量：

```text
totalMinutes >= prepMinutes
totalMinutes >= cookMinutes
totalMinutes >= passiveMinutes
abs(total - (prep + cook + passive)) <= max(10, total * 0.25)
```

允许并行步骤带来偏差，但不得用并行作为明显不可能时间的借口。用户设置最大时间时，默认不允许超出。

---

## 9. RecipeIngredient

```ts
type RecipeIngredient = {
  id: string;
  ingredientId: string | null;
  canonicalCode: string | null;
  displayName: string;
  originalName: string | null;

  quantity: number | null;
  unitCode: IngredientUnitCode;
  grams: number | null;
  amountText: string;

  preparation: string | null;
  optional: boolean;
  userHasIngredient: boolean;
  match: IngredientMatch;
};
```

### 9.1 标准 ID 与显示名并存

- 标准 ID 用于营养、过敏、搜索、统计和多语言；
- `displayName` 用于当前语言展示；
- `originalName` 保留用户输入或模型原称呼；
- 西红柿、番茄等别名可指向同一实体；
- 圣女果等相近但不总等价的食材保留独立实体。

### 9.2 IngredientMatch

```ts
type IngredientMatch = {
  status: "canonical" | "alias" | "fuzzy" | "custom" | "unresolved";
  confidence: number | null;
  matchedAlias: string | null;
  normalizationVersion: string;
};
```

约束：

- canonical/alias 应拥有标准 `ingredientId`；
- custom/unresolved 可以没有标准 ID；
- 没有标准 ID 时不能伪造数据库营养值；
- confidence 不是食品安全放行依据；
- 高风险模糊匹配应进入用户确认或保守规则。

### 9.3 单位

首版受控单位：

```text
g, kg, ml, l, piece, tsp, tbsp, cup, pinch, clove,
slice, package, to_taste
```

- `amountText` 是展示快照；
- `quantity + unitCode` 是结构化数量；
- `grams` 用于营养换算，可为空或估算；
- `to_taste` 不应带虚假精确克重；
- 未知单位不能自动当作克；
- 调味品不能默认等于用户已经拥有。

---

## 10. MissingIngredient

```ts
type MissingIngredient = {
  ingredientId: string | null;
  displayName: string;
  reason: "required" | "recommended" | "seasoning" | "substitution";
  importance: "required" | "optional";
  suggestedSubstitutes: string[];
};
```

不变量：

- required 缺失项必须在 UI 中明确；
- “只用现有食材”模式下，不得存在 required 缺失；
- 缺失项不能只藏在步骤文字中；
- 替代项仍需经过过敏、忌口和安全校验；
- 调味品缺失不能被系统静默忽略。

---

## 11. RecipeStep

```ts
type RecipeStep = {
  id: string;
  order: number;
  title: string | null;
  instruction: string;
  durationSeconds: number | null;
  timerRecommended: boolean;
  temperature: StepTemperature | null;
  ingredientRefs: string[];
  applianceRefs: string[];
  safetyNotes: string[];
};
```

约束：

- `order` 从 1 连续递增，不得重复或跳号；
- `id` 用于烹饪进度和计时器，不依赖数组索引；
- `timerRecommended=true` 时必须有正数 duration；
- 步骤引用的食材必须存在；
- 不能使用用户没有且不可替代的厨具；
- 高风险食材步骤要有程序规则可验证的信息；
- 不允许“炒熟即可”成为唯一熟度描述；
- 不允许在步骤中偷偷加入食材或过敏原。

### 11.1 StepTemperature

```ts
type StepTemperature = {
  value: number | null;
  unit: "celsius" | "fahrenheit" | "heat_level";
  heatLevel: "low" | "medium_low" | "medium" | "medium_high" | "high" | null;
  targetType: "appliance" | "oil" | "food_internal" | "water" | "ambient";
};
```

内部熟度温度不得由模型自行作为安全标准，最终由食品安全规则确认或补充。

---

## 12. 厨具引用

规范化代码示例：

```text
stove, oven, microwave, rice_cooker, air_fryer, blender,
pressure_cooker, steamer, pan, pot, knife, cutting_board
```

- 模型输出别名由服务端映射；
- 用户只有电饭锅时不得要求烤箱；
- 基础工具是否默认允许由产品规则确定；
- 替代厨具改变时间或步骤时，必须生成真正可执行的替代流程。

---

## 13. RecipeSubstitution

```ts
type RecipeSubstitution = {
  id: string;
  targetIngredientRef: string;
  substituteIngredientId: string | null;
  substituteName: string;
  ratioText: string | null;
  impact: {
    flavor: string | null;
    texture: string | null;
    time: string | null;
    nutrition: string | null;
  };
  conditions: string[];
};
```

替代物必须通过过敏、忌口和饮食目标检查；不得把同一过敏原组作为“安全替代”，也不能借替代绕过“只用现有食材”。

---

## 14. RecipeTip

```ts
type RecipeTip = {
  id: string;
  type: "quality" | "storage" | "serving" | "efficiency" | "beginner";
  text: string;
};
```

Tip 不能承载阻断性安全信息、过敏警告、医疗承诺或与步骤冲突的要求。安全内容必须进入 warning/safety。

---

## 15. RecipeWarning

```ts
type RecipeWarning = {
  id: string;
  code: string;
  severity: "info" | "warn" | "block";
  category:
    | "allergen"
    | "food_safety"
    | "storage"
    | "nutrition"
    | "equipment"
    | "missing_ingredient"
    | "data_quality";
  title: string;
  message: string;
  ruleId: string | null;
  source: "rule_engine" | "nutrition_engine" | "business_rule" | "system";
  acknowledgedRequired: boolean;
};
```

- 对外 completed Recipe 不得含未处理 block；
- 模型不能把 source 标为 rule_engine；
- 客户端不得自行降低 severity；
- 警告不能只靠颜色展示；
- 同一规则重复命中需要去重。

---

## 16. RecipeSafety

```ts
type RecipeSafety = {
  status: "passed" | "passed_with_warnings" | "blocked" | "withdrawn";
  ruleSetVersion: string;
  checkedAt: string;
  warningCount: number;
  blockingRuleIds: string[];
  advisoryRuleIds: string[];
};
```

`safety` 只能由服务端规则引擎写入。模型输出的 `safe=true`、客户端提交的安全状态、Prompt 自检文本都不可信。

展示最低条件：

```text
recipe.status == completed
AND safety.status in [passed, passed_with_warnings]
AND safety.ruleSetVersion is supported
AND no unresolved blocking finding
```

安全规则异常时：

- 请求失败或 blocked；
- 不写 completed；
- 不返回候选正文；
- 记录稳定错误码和 requestId。

规则更新或举报确认后，可将历史 Recipe 标记为 `withdrawn`，客户端不得继续进入烹饪模式。

---

## 17. RecipeNutrition

```ts
type RecipeNutrition = {
  status: "available" | "partial" | "unavailable";
  source: "database_calculated" | "ai_estimated" | "mixed" | "unavailable";
  confidence: "high" | "medium" | "low" | "unavailable";
  calculationVersion: string | null;
  total: NutritionValues | null;
  perServing: NutritionValues | null;
  estimatedIngredientRefs: string[];
  unmatchedIngredientRefs: string[];
  disclaimerCode: string;
};
```

```ts
type NutritionValues = {
  caloriesKcal: number | null;
  proteinG: number | null;
  carbohydratesG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
};
```

原则：

- 首选标准数据库按克重计算；
- 模型估算不得伪装成数据库计算；
- `perServing = total / servings`，允许舍入误差；
- 数据不足可返回 unavailable，不阻断安全菜谱；
- `null` 表示无可靠数据，不写 0；
- UI 始终显示来源和免责声明；
- 营养结果不是医疗建议。

---

## 18. RecipeProvenance

```ts
type RecipeProvenance = {
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  businessRuleVersion: string;
  foodSafetyRuleVersion: string;
  nutritionVersion: string | null;
  generationMode: "ai" | "fixture" | "manual" | "migrated";
};
```

用于复现、灰度、回滚和质量分析。对外 DTO 可隐藏内部细节，但内部必须可追踪。Prompt 全文、密钥和用户敏感信息不能放入 provenance。

---

## 19. 顶层跨字段不变量

### 19.1 份量

- servings 与请求一致；
- 食材总量与份量基本合理；
- nutrition perServing 与 total 一致；
- 改份量不能只改显示数字。

### 19.2 时间

- total 不超过用户上限；
- 分步时间与总时间不明显矛盾；
- 高耗时处理不能伪装成 10 分钟；
- 并行逻辑必须可解释。

### 19.3 食材

- 步骤食材均可引用；
- required 缺失不能标记 userHas=true；
- 禁止食材不能出现在食材、步骤、替代或 Tip；
- 过敏原需要检查别名和衍生物；
- 自定义食材不能获得高置信数据库营养。

### 19.4 安全

- completed 与 safety blocked 不能同时存在；
- passed_with_warnings 必须至少有一个 warn；
- warningCount 与去重结果一致；
- 规则引擎异常不能写 passed；
- withdrawn 不能进入烹饪模式。

---

## 20. 请求上下文与输出关系

```ts
type RecipeValidationContext = {
  requestedIngredients: NormalizedIngredientInput[];
  servings: number;
  maxTimeMinutes: number;
  allowedAppliances: string[];
  allergens: string[];
  forbiddenIngredients: string[];
  dietaryPreferences: string[];
  strictUseOnlyProvidedIngredients: boolean;
  locale: string;
};
```

校验器输出统一 Issue：

```ts
type ValidationIssue = {
  layer: "syntax" | "schema" | "business" | "food_safety" | "nutrition";
  code: string;
  path: string | null;
  severity: "error" | "warning";
  retryable: boolean;
  details: Record<string, unknown> | null;
};
```

这些 Issue 用于内部诊断，不直接显示供应商原始错误。

---

## 21. 模型 Candidate 子 Schema

模型不直接生成最终 Recipe，只生成：

```ts
type RecipeCandidate = {
  title: string;
  description: string;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  cuisineCode: string | null;
  time: RecipeTimeCandidate;
  ingredients: RecipeIngredientCandidate[];
  missingIngredients: MissingIngredientCandidate[];
  steps: RecipeStepCandidate[];
  substitutions: RecipeSubstitutionCandidate[];
  tips: string[];
};
```

服务端补充 ID、requestId、标准食材映射、warning、safety、nutrition、provenance、createdAt 和 status。这样可以从结构上阻止模型伪造可信字段。

---

## 22. Zod 实现骨架

```ts
import { z } from "zod";

const RecipeTimeSchema = z.object({
  prepMinutes: z.number().int().min(0).max(1440),
  cookMinutes: z.number().int().min(0).max(1440),
  passiveMinutes: z.number().int().min(0).max(1440),
  totalMinutes: z.number().int().min(1).max(1440),
});

const RecipeStepSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int().positive(),
  title: z.string().min(1).max(120).nullable(),
  instruction: z.string().min(1).max(1000),
  durationSeconds: z.number().int().positive().max(86400).nullable(),
  timerRecommended: z.boolean(),
  temperature: z.unknown().nullable(),
  ingredientRefs: z.array(z.string().uuid()),
  applianceRefs: z.array(z.string()),
  safetyNotes: z.array(z.string().max(500)),
});

export const RecipeV1Schema = z.object({
  schemaVersion: z.literal("recipe.v1.0.0"),
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  status: z.enum(["completed", "blocked", "withdrawn"]),
  servings: z.number().int().min(1).max(12),
  difficulty: z.enum(["easy", "medium", "hard"]),
  cuisineCode: z.string().max(64).nullable(),
  time: RecipeTimeSchema,
  ingredients: z.array(z.unknown()).min(1).max(100),
  missingIngredients: z.array(z.unknown()).max(50),
  steps: z.array(RecipeStepSchema).min(1).max(100),
  nutrition: z.unknown(),
  substitutions: z.array(z.unknown()).max(50),
  warnings: z.array(z.unknown()).max(100),
  tips: z.array(z.unknown()).max(30),
  safety: z.unknown(),
  provenance: z.unknown(),
  createdAt: z.string().datetime({ offset: true }),
}).strict();
```

正式实现必须拆成子 Schema，并用 `superRefine` 验证步骤连续、引用完整、时间和安全状态一致。

---

## 23. API DTO 与 Snapshot

### 23.1 Recipe Snapshot

用于历史还原、审计、版本追踪。Snapshot 应完整、版本化、写入后原则上不可变，并与关系数据在同一事务中保存。不能包含 Secret、Token、完整 Prompt 或用户档案。

### 23.2 Recipe Detail DTO

基于 Snapshot 生成，可隐藏内部 provenance、增加当前操作权限和撤回状态，但不能改变业务语义。

### 23.3 Recipe Summary DTO

列表只返回 id、title、摘要、time、difficulty、servings、safety 摘要、nutrition 摘要、createdAt 和 favorite。Summary 由正式数据派生，不是独立事实来源。

---

## 24. 数据库映射

| Schema 字段 | 数据库 |
|---|---|
| 顶层基本字段 | `recipes` |
| ingredients | `recipe_ingredients` |
| steps | `recipe_steps` |
| nutrition | `recipe_nutrition` / 快照 |
| warnings/safety | 评估表与快照 |
| 完整对象 | `recipes.snapshot_json` |
| request lifecycle | `generation_requests` |

写入要求：

1. 关系数据和 Snapshot 同一事务；
2. Snapshot 先通过 Final Schema；
3. 数据库约束不代替业务校验；
4. Mapper 有双向测试；
5. 读取历史时不拼装未验证对象。

---

## 25. 验证流水线

```text
Provider Output
  → JSON 语法
  → Candidate Schema
  → 业务不变量
  → 食材标准化与引用绑定
  → Food Safety Rule Engine
  → Nutrition Engine
  → Final Recipe Assembly
  → Final Recipe Schema
  → Transactional Persistence
  → API DTO
  → Client Schema Check
```

| 层 | 示例 | 动作 |
|---|---|---|
| syntax | 非 JSON | 最多一次结构修复 |
| candidate schema | 缺步骤 | 修复或重新生成 |
| business | 超时、厨具冲突 | 重生成或失败 |
| safety | 过敏或危险 | 阻断，不展示 |
| nutrition | 无法匹配 | 降级 unavailable |
| final schema | 内部组装错误 | INTERNAL_ERROR |

---

## 26. 修复边界

允许修复：JSON 包在代码块、字段名偏差、数字字符串、可确定的格式字段、无语义影响的步骤重编号。

禁止修复：删除过敏原、改变用户食材、增加厨具、放宽时间、伪造营养来源、把 required missing 改为 optional、自动写安全通过。

安全和业务问题必须重新生成或阻断，不能靠代码偷偷改成“看起来正确”。

---

## 27. 迁移策略

```ts
function readRecipeSnapshot(input: unknown): RecipeV1 {
  const version = detectRecipeVersion(input);
  switch (version) {
    case "recipe.v1.0.0":
      return RecipeV1Schema.parse(input);
    case "recipe.v0.9.0":
      return migrateV09ToV1(input);
    default:
      throw new UnsupportedRecipeSchemaError(version);
  }
}
```

规则：

- 新生成只写当前默认版本；
- 普通读取不覆盖旧 Snapshot；
- 批量迁移独立任务、可暂停、可回滚；
- 每个迁移器有固定 Fixtures；
- 迁移后重跑业务和安全验证；
- 不使用数据库字符串替换完成语义迁移。

---

## 28. 测试体系

### 单元测试

- 字段边界和枚举；
- null 与缺失；
- 步骤连续；
- 计时器约束；
- 时间交叉校验；
- warning/safety 一致；
- nutrition total/per serving；
- ingredient ref 完整性；
- unknown keys。

### 契约测试

- Edge Function 响应通过共享 Schema；
- App Fixtures 使用同一 Schema；
- OpenAPI 示例通过；
- 数据库 Mapper 输出通过；
- 历史迁移通过。

### 负例

- 非 JSON、空对象、多余字段；
- 字符串数字、负分钟、0 份；
- 重复/缺失步骤；
- 未引用食材；
- 禁止食材藏在 Tip；
- 模型伪造 safety；
- nutrition source 冲突；
- 超过 256 KB；
- 未知旧版本。

---

## 29. 安全与隐私

Snapshot 不得包含：Access Token、API Key、完整系统 Prompt、用户邮箱、设备 ID、原始健康描述、未脱敏 Provider 错误和内部堆栈。

日志只记录 requestId、Schema 版本、失败层、字段路径和稳定错误码；默认不记录完整 Recipe 或原始模型响应。

---

## 30. 性能与大小预算

建议：

- Snapshot 目标 < 128 KB，硬上限 256 KB；
- 食材 1–100；
- 步骤 1–100，产品目标通常 3–20；
- warnings 0–100；
- tips 0–30；
- 列表接口不返回完整步骤；
- 在中低端 Android 真机验证解析和渲染。

---

## 31. 国际化

- 枚举和 canonical code 不翻译；
- 用户可见文本按 locale；
- ingredient ID 稳定；
- warning 使用 code + 本地化文案；
- 不把中文显示名当跨语言主键；
- 新增 locale 前跑完整固定测试集。

---

## 32. 实施顺序

1. primitives 和 enums；
2. Candidate Schema；
3. Final Recipe v1；
4. cross-field validator；
5. fixtures 和 negative cases；
6. database mapper；
7. API mapper；
8. client parse boundary；
9. migration registry；
10. 接入 AI、Rule 和 Nutrition Engine。

---

## 33. Definition of Done

- [ ] `recipe.v1.0.0` Zod Schema 已建立；
- [ ] TypeScript 类型由 Schema 推导；
- [ ] Candidate 与 Final Recipe 分离；
- [ ] App、API、数据库 Mapper 使用同一共享包；
- [ ] 跨字段不变量有测试；
- [ ] 安全状态只能由服务端规则引擎写入；
- [ ] 营养来源和不可用状态明确；
- [ ] Snapshot 与关系表事务一致；
- [ ] 旧版本读取迁移有 Fixtures；
- [ ] 大小、文本和数组上限已验证；
- [ ] Android 真机可解析合法和异常 Fixtures；
- [ ] API、数据库、Prompt 和规则文档同步；
- [ ] `CHANGELOG.md` 与 `CURRENT_STATUS.md` 已更新。

---

## 34. 结论

Recipe Schema 是 AI Kitchen 的核心产品契约。模型可以更换、Prompt 可以升级、页面可以重做，但正式菜谱的字段语义、可信来源、校验顺序和版本策略必须保持稳定。只有候选结果经过服务端程序验证并组装为正式 Recipe 后，系统才真正拥有一份可以保存、展示和执行的菜谱。
