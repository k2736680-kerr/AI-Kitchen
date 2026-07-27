# 11 — Nutrition Engine

> 本文定义 AI Kitchen 的营养估算体系。目标是提供可解释、可追踪、带来源和置信度的一般性营养参考，而不是医疗级计算、诊断或治疗建议。

| 属性 | 内容 |
|---|---|
| 文档状态 | Draft / Ready for Review |
| 实施状态 | 尚未选择正式营养数据源，尚未实现计算服务 |
| 依赖 | `03_DATABASE_DESIGN.md`、`08_RULE_ENGINE.md`、`10_RECIPE_SCHEMA.md` |
| 最后更新 | 2026-07-27 |

---

## 1. 目标

Nutrition Engine 必须：

- 优先使用有许可、可追踪的标准数据库；
- 基于标准食材 ID 和可食用克重计算；
- 区分整道菜和每份；
- 标记生重/熟重、估算克重和缺失项；
- 输出来源、版本、覆盖率和置信度；
- 无法可靠计算时返回 `unavailable`，不编造数值；
- 与 AI Candidate 解耦，模型不能声明数据库计算结果；
- 支持数据源升级后重算或保留历史快照。

---

## 2. 非目标

首版不提供：

- 医疗诊断或疾病治疗饮食方案；
- 个体代谢率和处方级营养建议；
- 实验室精度；
- 所有品牌食品和餐馆菜品的精确数据；
- 对烹饪损失、吸油率和水分变化的完全精确建模；
- 将“减脂”“增肌”包装为医疗承诺。

---

## 3. 为什么不能直接使用模型营养值

模型估算可作为低可信回退研究数据，但不能默认展示为数据库结果，原因包括：

- 数值可能不一致；
- 单位和份量经常混淆；
- 无法证明来源；
- 容易把每份当整道菜；
- 对品牌、熟重、油吸收和可食部处理不稳定；
- 模型升级后同一菜谱结果变化。

因此 Final Recipe 的可信营养字段由服务端计算器生成。若保留 `ai_estimated`，必须单独标识、低置信度、可关闭，并不能混入 `database_calculated`。

---

## 4. 数据源选择标准

正式选择前必须评估：

- 商业使用许可；
- 覆盖首发地区常见食材；
- 数据更新频率；
- 生/熟状态；
- 可食部和单位；
- 营养素定义；
- API/下载能力与成本；
- 数据驻留和第三方条款；
- 是否允许缓存、派生和再分发。

数据库来源、许可文件和版本必须记录在 Registry。不得因为公开可访问就默认允许商业使用。

---

## 5. 标准数据模型

```ts
interface NutritionReference {
  ingredientCode: string;
  sourceId: string;
  sourceItemId: string;
  sourceVersion: string;
  foodState: 'raw' | 'cooked' | 'prepared' | 'unknown';
  basisGrams: 100;
  ediblePortionRatio?: number;
  nutrients: {
    energyKcal?: number;
    proteinG?: number;
    carbohydrateG?: number;
    fatG?: number;
    fiberG?: number;
    sugarG?: number;
    sodiumMg?: number;
  };
  confidence: 'verified' | 'mapped' | 'approximate';
  effectiveFrom: string;
}
```

P0/P1 只承诺能稳定解释的核心营养素。新增微量营养素必须先对齐单位、日摄入参考、来源和 UI 容量。

---

## 6. 计算输入

每个 recipe ingredient 至少需要：

- canonical ingredient code；
- amount；
- unit；
- gram equivalent 或转换路径；
- 是否估算；
- 生/熟状态；
- 是否可食部分；
- nutrition reference 匹配状态；
- missing ingredient 是否真的加入最终菜谱。

模型生成的“适量”“少许”不能直接进入精确计算。可使用受控默认范围，但必须标记 estimated，并降低覆盖率和置信度。

---

## 7. 单位转换

### 7.1 单位分类

- 质量：g、kg；
- 体积：ml、l、tsp、tbsp、cup；
- 计数：个、片、瓣、把；
- 描述：少许、适量。

质量单位可直接换算；体积到质量需要食材密度；计数到质量需要标准食材默认克重；描述单位原则上不可精确计算。

### 7.2 转换来源

```ts
interface UnitConversion {
  ingredientCode: string;
  fromUnit: string;
  gramsPerUnit: number;
  region?: string;
  sourceId: string;
  version: string;
  confidence: 'verified' | 'estimated';
}
```

不能用全局“一杯=固定克数”处理所有食材。体积换算必须按食材或明确无法换算。

---

## 8. 基础公式

```text
单项营养 = 可食用克数 / 100 × 每 100g 营养值
整道菜营养 = 可计算食材之和
每份营养 = 整道菜营养 / servings
```

计算器内部使用十进制或明确舍入策略，展示层再格式化。禁止逐项过早四舍五入后累加。

### 8.1 可食部

若数据源提供 edible portion：

```text
可食用克数 = 购买重量 × ediblePortionRatio
```

Recipe 中通常记录用户实际加入的可食用部分，因此不要重复扣除。字段必须明确是 purchase weight 还是 edible weight。

---

## 9. 烹饪状态与产率

首版策略：

1. 优先匹配与 Recipe 状态一致的 reference；
2. 无熟食 reference 时可使用生食 reference，但标记假设；
3. 不在没有来源时自行推断维生素损失；
4. 水分变化影响每 100g 浓度，但整道菜总量不应简单重复换算；
5. 油吸收率、汤汁剩余和腌料消耗属于高不确定项；
6. 无法可靠处理时降低 confidence 并展示说明。

---

## 10. 盐、油和调味品

“适量盐”“煎炸用油”会显著影响钠和脂肪。处理策略：

- 要求 Candidate 尽量输出可执行范围；
- 若仍为描述单位，标记未计入或估算；
- 不把锅中全部用油都视为摄入；
- 可以在 UI 展示“调味品用量会影响实际数值”；
- 计算覆盖率必须反映未计算项；
- 用户手动修改用量后可重新计算。

---

## 11. 结果模型

```ts
interface NutritionResult {
  source: 'database_calculated' | 'ai_estimated' | 'unavailable';
  confidence: 'high' | 'medium' | 'low' | 'unavailable';
  calculationVersion: string;
  referenceVersions: string[];
  total: NutrientValues | null;
  perServing: NutrientValues | null;
  servings: number;
  coverage: {
    ingredientCount: number;
    calculatedCount: number;
    excludedCount: number;
    weightCoveragePercent?: number;
  };
  assumptions: NutritionAssumption[];
  exclusions: NutritionExclusion[];
  calculatedAt: string;
}
```

Nutrition 不可用时：`total=null`、`perServing=null`、`confidence=unavailable`，而不是全部返回 0。

---

## 12. 置信度

建议由确定性评分生成，不由模型自由给出：

### High

- 主要食材全部标准化；
- 质量或可靠单位换算；
- 数据源状态匹配；
- 重量覆盖率高；
- 无重要“适量”项。

### Medium

- 少量计数或密度估算；
- 部分调味品未计入；
- 生/熟状态存在可解释近似。

### Low

- 多个主要食材模糊；
- 品牌/复合食材映射近似；
- 大量描述单位；
- 数据源覆盖不足。

低于产品门限时应显示 unavailable，而不是提供看似精确的小数。

---

## 13. 覆盖率与缺失

营养结果必须告诉用户“算了多少”。示例：

```json
{
  "ingredientCount": 8,
  "calculatedCount": 6,
  "excludedCount": 2,
  "weightCoveragePercent": 87
}
```

排除原因使用受控 code：`UNKNOWN_INGREDIENT`、`UNCONVERTIBLE_UNIT`、`NO_REFERENCE`、`BRAND_COMPOSITION_UNKNOWN`、`OPTIONAL_NOT_INCLUDED`。

---

## 14. Snapshot 与重算

生成时保存营养 Snapshot，包括：

- calculationVersion；
- source/reference versions；
- 结果；
- assumptions；
- coverage。

数据源升级后不静默改写历史 Snapshot。可提供 re-evaluation：

- 保存新 assessment；
- 标记新旧版本；
- UI 可显示“已按新数据更新”；
- 原始 Recipe 内容不变；
- 大规模重算需要异步任务和成本控制。

---

## 15. API 行为

生成成功但营养不可用时，Recipe 仍可返回：

```json
{
  "nutrition": {
    "source": "unavailable",
    "confidence": "unavailable",
    "total": null,
    "perServing": null,
    "reasonCode": "INSUFFICIENT_REFERENCE_COVERAGE"
  }
}
```

只有食品安全失败才阻止 Recipe 展示。Nutrition service 超时应记录 `NUTRITION_UNAVAILABLE`，不得触发模型重复生成并重复计费。

---

## 16. 用户修改与份量缩放

- servings 变化时按比例缩放可缩放食材；
- 某些单位需要合理舍入；
- 调味品、油和发酵剂可能不完全线性；
- 修改食材或份量后生成新的 nutrition assessment；
- 不覆盖原始生成 Snapshot；
- UI 必须标记用户修改后的状态。

首版可以限制编辑范围，避免声称支持完整配方工程。

---

## 17. 产品文案

允许：

- “营养估算”；
- “每份约”；
- “基于已识别食材和用量计算”；
- “部分调味品未计入”；
- “不作为医疗建议”。

禁止：

- “精准营养”；
- “医疗级”；
- “保证减重”；
- “治疗糖尿病/高血压”；
- 在低置信度时显示过多小数制造精确幻觉。

---

## 18. 数据库设计补充

建议实体：

- `nutrition_sources`；
- `nutrition_reference`；
- `ingredient_unit_conversions`；
- `nutrition_calculations`；
- `recipe_nutrition_assessments`。

索引围绕 `ingredient_id + food_state + source_version`。生产数据导入使用 migration/data pipeline，不允许直接手改大量数值。来源许可和校验报告不应只存在个人电脑。

---

## 19. 测试

### 19.1 单元测试

- g/kg、ml/l；
- 计数单位；
- 密度转换；
- servings；
- null 与 0；
- 负数、极大值、NaN；
- 舍入；
- 覆盖率；
- 置信度。

### 19.2 Golden Recipes

包含：

- 简单称重食材；
- 鸡蛋“个”；
- 米饭生/熟；
- 汤和剩余汤汁；
- 油炸；
- 复合酱料；
- 大量“适量”；
- 未知自定义食材；
- 份量缩放；
- 品牌食品。

### 19.3 性质测试

- servings 翻倍时整道菜总营养不变、每份减半；
- 添加正重量食材不能使总能量下降；
- 未匹配项不能被当作 0 营养；
- 重复执行同版本结果一致；
- 展示舍入不改变内部总值。

---

## 20. 监控

- 营养可用率；
- 平均重量覆盖率；
- high/medium/low 分布；
- 缺失 reference Top N；
- 单位转换失败率；
- 计算耗时；
- 数据版本分布；
- 用户反馈率；
- 重新计算差异异常。

监控只使用标准 code 和聚合值，避免将用户完整菜谱和健康目标导入第三方监控。

---

## 21. Definition of Done

- [ ] 数据源许可和版本已确认；
- [ ] 标准食材映射覆盖首版常见清单；
- [ ] 单位转换和默认克重有来源；
- [ ] 总量/每份、null/0、舍入规则明确；
- [ ] 结果包含来源、版本、覆盖率、置信度和假设；
- [ ] 不可用时结构化降级；
- [ ] AI 值不能伪装成数据库计算；
- [ ] Golden 和性质测试通过；
- [ ] 历史 Snapshot 可追踪；
- [ ] 产品文案和隐私说明一致；
- [ ] 监控与回滚验证完成。

---

## 22. 当前结论

Nutrition Engine 的核心不是尽可能多展示数字，而是只展示能解释的数据。首版应优先支持常见标准食材、明确重量和核心宏量营养素。任何来源不明、覆盖不足或单位无法换算的情况，都应诚实降级，而不是用模型生成看似精确的结果。
