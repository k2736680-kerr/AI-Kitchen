# 03 — Database Design

> AI Kitchen 数据库设计基线。本文定义 PostgreSQL 数据模型、表职责、字段语义、约束、索引、RLS、迁移、数据生命周期、备份与测试要求。本文是后续 `04_API_CONTRACT.md`、`05_AUTH_AND_IDENTITY.md`、`10_RECIPE_SCHEMA.md`、AI 引擎、规则引擎和隐私数据地图的上游约束。

| 属性 | 内容 |
|---|---|
| 文档版本 | 1.0.0 |
| 状态 | Draft / Ready for Review |
| 数据库 | Supabase PostgreSQL |
| 适用阶段 | P0–P2 |
| 最后更新 | 2026-07-24 |
| 实施状态 | 尚未创建数据库或迁移 |

---

## 1. 文档目标

本设计解决以下问题：

- App、API、AI 输出和数据库对同一业务字段使用一致含义；
- 用户数据有明确所有权，不能跨用户读取或修改；
- AI 生成请求可以追踪、幂等、重试、计费和审计；
- 菜谱既能稳定还原历史展示，又能按食材、步骤和时间查询；
- 食材别名、过敏、食品安全和营养计算建立在标准食材 ID 上；
- 数据库变更可迁移、可测试、可回滚，不依赖手工改表；
- 数据保留、软删除、账户删除和日志最小化有明确边界；
- 首版保持足够简单，但不会为拍照识别、周菜单、多语言或订阅提前制造不可逆结构。

本文描述的是**目标设计**，不是已完成实现。只有迁移在 development 和 staging 执行、测试通过并记录后，相关表或能力才能标记为 `IMPLEMENTED`。

---

## 2. 上游决策与不可破坏边界

本文继承以下已接受决策：

- `D-003`：App 不直接调用 AI Provider；
- `D-005`：PostgreSQL + RLS 是主数据系统；
- `D-006`：Monorepo + 共享 Schema；
- `D-007`：AI 输出必须通过四层校验；
- `D-008`：食品安全失败关闭；
- `D-009`：标准食材 ID 与别名分离；
- `D-010`：guest → anonymous → registered 身份路径；
- `D-013`：`requestId` + `idempotencyKey` 全链路使用；
- `D-014`：关系规范化与版本化 Recipe Snapshot 并存。

因此数据库设计不得：

- 用一张自由 JSON 表替代核心领域关系；
- 让客户端持有 Service Role Key；
- 通过前端隐藏代替 RLS；
- 只保存 AI 原始文本而不保存经过校验的结构化结果；
- 只依赖 Prompt 判断过敏和食品安全；
- 在没有迁移方案时改变共享字段类型；
- 把 development、staging、production 放在同一个数据环境中。

---

## 3. 为什么选择 PostgreSQL

### 3.1 本项目的数据本质是关系型

AI Kitchen 的核心数据不是互不相关的文档：

- 一个用户拥有偏好、菜谱、收藏和反馈；
- 一个菜谱包含多条食材和多条步骤；
- 一个标准食材拥有多个语言和地区别名；
- 一个生成请求可能包含多次模型调用尝试；
- 一条食品安全规则可能匹配多个食材和条件；
- 一条营养参考数据必须关联标准食材、来源和版本；
- 收藏关系需要保证同一用户不能重复收藏同一菜谱；
- 幂等请求需要数据库唯一约束，而不是仅靠代码判断。

这些关系需要外键、唯一约束、事务、部分索引、行级权限和稳定查询计划。PostgreSQL 与项目需求天然匹配。

### 3.2 为什么不用 MongoDB 作为主库

MongoDB 可以保存灵活文档，但本项目不把“灵活”放在“可验证”之前。若把完整菜谱、用户、收藏、食材别名和规则全部塞入文档，会带来：

- 标准食材被复制到大量菜谱中，难以统一修正；
- 收藏、请求幂等和所有权约束更依赖应用代码；
- 多语言别名和营养来源查询复杂；
- 食材、步骤和安全结果难以独立统计；
- Schema 漂移更难被 AI 编程工具识别；
- 历史文档中同名字段可能拥有不同类型。

本项目允许 JSONB，但只在明确边界内使用，例如不可变 Recipe Snapshot、可选的规则条件和脱敏供应商元数据。JSONB 是关系模型的补充，不是替代。

### 3.3 为什么不用 Firestore/Firebase JSON 作为主库

Firestore 适合实时文档和简单移动应用，但本项目需要：

- 多表事务和唯一约束；
- `auth.users.id` 所有权与 RLS；
- 复杂索引和 SQL 分析；
- 食材、规则、营养的关系查询；
- 生成请求状态机的条件更新；
- 数据迁移、审计和结构化成本统计。

采用 Firestore 会把大量一致性责任推给应用层，并增加共享 Schema 与查询模型之间的漂移风险。

### 3.4 为什么不用“一张 recipes 表 + 一个 JSON 字段”

单表 JSON 原型开发很快，但会很快遇到：

- 无法可靠查询“包含鸡蛋但不包含牛奶”的菜谱；
- 步骤顺序和食材重复只能靠应用代码维护；
- 食材标准 ID、单位和克重难以建立外键；
- 无法在数据库层防止重复步骤序号；
- 历史统计和营养重算需要扫描完整 JSON；
- JSON 字段升级时难以判断哪些记录仍是旧结构。

因此采用：

```text
recipes                菜谱主记录、版本、状态、摘要和完整快照
recipe_ingredients     可查询、可约束的食材明细
recipe_steps           可查询、可约束的步骤明细
```

同时在 `recipes.recipe_snapshot` 保存通过校验的版本化完整快照，用于历史还原。规范化结构服务于查询、约束和分析；快照服务于稳定展示和版本兼容。

---

## 4. 数据设计原则

### 4.1 单一事实来源

- 用户身份事实来源：Supabase Auth；
- 用户业务配置事实来源：`profiles`、`user_preferences`；
- 食材事实来源：`ingredients`、`ingredient_aliases`；
- 菜谱事实来源：关系表 + 已校验 `recipe_snapshot`；
- 生成生命周期事实来源：`generation_requests`；
- 单次模型调用事实来源：`generation_attempts`；
- 安全规则事实来源：版本化 `food_safety_rules`；
- 营养值事实来源：版本化 `nutrition_reference`。

不得在多个表中维护可冲突的“当前值”。必须冗余时，要标注权威来源、刷新方式和一致性测试。

### 4.2 默认规范化，按明确用途冗余

允许冗余的条件：

1. 为了历史快照不可变；
2. 为了避免展示依赖已更新的参考数据；
3. 为了高频读性能且有明确刷新机制；
4. 为了审计保留当时使用的版本和参数。

禁止冗余的情况：

- 只是为了少写一次 JOIN；
- 同一字段在多个表均可直接编辑；
- 没有定义哪个值是权威来源；
- 没有测试或重建方式；
- 冗余包含不必要的敏感数据。

### 4.3 生成结果默认不可变

一份已完成并展示给用户的 AI 菜谱，应视为历史产物。用户收藏、查看或进入烹饪模式时，不应因标准食材名称、Prompt 或营养数据库更新而悄悄变化。

允许发生的后续操作：

- 标记收藏；
- 软删除；
- 创建新的份量换算版本；
- 添加用户反馈；
- 添加纠正或安全处置状态；
- 生成新菜谱替代旧结果。

不建议原地重写已展示菜谱正文。确需更正高风险内容时，应保留修订记录或将原记录标记为不可继续使用。

### 4.4 安全与隐私优先

- 所有用户拥有的数据必须包含 `owner_id`；
- `owner_id` 类型与 `auth.users.id` 一致，为 UUID；
- RLS 默认拒绝；
- Service Role 只用于受控后端路径；
- 不在数据库保存 Access Token、Refresh Token、AI Key 或密码；
- 原始模型输出默认不长期保存；
- 过敏和饮食偏好只保存实现功能所需的最小结构；
- 日志表不得复制完整用户输入和完整菜谱。

### 4.5 可迁移与向后兼容

数据库字段变化必须遵循：

```text
Expand → Backfill → Dual Read/Write（必要时）→ Verify → Contract
```

不得在同一次发布中直接删除仍被上一版本 App 使用的字段。

---

## 5. 命名、类型和通用字段规范

### 5.1 命名规范

| 对象 | 规范 | 示例 |
|---|---|---|
| 表 | `snake_case`、复数名词 | `generation_requests` |
| 列 | `snake_case` | `schema_version` |
| 主键 | `id` | `recipes.id` |
| 外键 | `<entity>_id` | `recipe_id` |
| 布尔值 | `is_` / `has_` 前缀，或语义明确形容词 | `is_active`, `blocking` |
| 时间 | `_at` 后缀 | `created_at`, `deleted_at` |
| 日期 | `_date` 后缀 | `effective_from_date` |
| 版本 | `_version` 后缀 | `prompt_version` |
| 索引 | `idx_<table>__<columns>` | `idx_recipes__owner_created` |
| 唯一索引 | `uq_<table>__<columns>` | `uq_favorites__owner_recipe` |
| 外键约束 | `fk_<table>__<column>` | `fk_recipe_steps__recipe_id` |
| 检查约束 | `ck_<table>__<rule>` | `ck_recipe_steps__positive_number` |
| RLS Policy | `<action>_<scope>` | `select_own_recipes` |

禁止在同一领域混用 `user_id`、`owner`、`uid` 表示同一概念。用户所有权统一使用 `owner_id`。

### 5.2 主键

业务实体默认使用 UUID：

```sql
id uuid primary key default gen_random_uuid()
```

原因：

- App、Edge Function 和数据库可安全生成标识；
- 不暴露记录数量；
- 适合跨环境导入和离线对象；
- 与 Supabase Auth ID 一致。

步骤序号、优先级等排序字段使用整数，但不作为全局主键。

### 5.3 时间

- 所有时间点使用 `timestamptz`；
- 数据库存 UTC，展示层根据用户时区转换；
- 不使用无时区 `timestamp` 表示事件时间；
- 纯日历日期才使用 `date`；
- `created_at` 默认 `now()`；
- 可变记录包含 `updated_at`；
- 软删除记录包含 `deleted_at`。

### 5.4 数值

- 分钟、秒、份数、Token 数使用整数；
- 克重和营养值使用 `numeric`，避免浮点累计误差；
- 成本使用 `numeric(14, 6)` 或供应商最小货币单位；
- 金额必须同时记录币种；
- 不使用 `real`/`double precision` 保存计费事实。

### 5.5 文本状态而非 PostgreSQL Native Enum

首版对可能演进的业务状态使用 `text + CHECK`，而不是 PostgreSQL Native Enum。

原因：

- Native Enum 删除或重命名值的迁移更重；
- 生成状态、反馈类别和安全类型仍可能扩展；
- `CHECK` 约束可与共享 Schema 同步更新；
- 回滚更容易。

稳定且长期不变的数据库内部类型未来可以重新评估。

### 5.6 JSONB 使用规则

允许使用 JSONB 的字段：

- `recipes.recipe_snapshot`：通过校验的完整历史快照；
- `generation_attempts.provider_metadata`：脱敏、有限字段的供应商元数据；
- `food_safety_rules.condition`：版本化规则条件 DSL；
- `feedback.context`：严格白名单后的客户端上下文；
- 迁移期间的兼容临时字段。

每个 JSONB 字段必须：

- 有对应 Schema 或字段白名单；
- 有 `schema_version` 或规则版本；
- 限制最大大小；
- 不保存密钥和完整敏感输入；
- 不被当作默认查询入口；
- 需要查询时建立明确的表达式或 GIN 索引，不能“先建一个万能 GIN”。

---

## 6. 领域和实体关系总览

```mermaid
entityRelationshipDiagram
    AUTH_USERS ||--|| PROFILES : has
    AUTH_USERS ||--|| USER_PREFERENCES : owns
    AUTH_USERS ||--o{ RECIPES : owns
    AUTH_USERS ||--o{ FAVORITES : creates
    AUTH_USERS ||--o{ FEEDBACK : submits
    AUTH_USERS ||--o{ GENERATION_REQUESTS : initiates

    INGREDIENTS ||--o{ INGREDIENT_ALIASES : has
    INGREDIENTS ||--o{ RECIPE_INGREDIENTS : referenced_by
    INGREDIENTS ||--o{ NUTRITION_REFERENCE : measured_by

    GENERATION_REQUESTS ||--o{ GENERATION_ATTEMPTS : contains
    GENERATION_REQUESTS ||--o| RECIPES : produces

    RECIPES ||--o{ RECIPE_INGREDIENTS : contains
    RECIPES ||--o{ RECIPE_STEPS : contains
    RECIPES ||--o{ FAVORITES : favorited_as
    RECIPES ||--o{ FEEDBACK : receives
    RECIPES ||--o{ RECIPE_SAFETY_FINDINGS : evaluated_by
    RECIPES ||--o| RECIPE_NUTRITION : summarized_by

    FOOD_SAFETY_RULES ||--o{ RECIPE_SAFETY_FINDINGS : triggers
```

说明：Mermaid 仅表达逻辑关系，最终外键和删除行为以本文详细定义为准。

---

## 7. 表清单与实施阶段

| 表 | 职责 | P0 | P1 | P2 |
|---|---|---:|---:|---:|
| `profiles` | 用户基础配置 | 可延后 | 必须 | 必须 |
| `user_preferences` | 忌口、过敏、厨具、默认条件 | 本地 | 必须 | 必须 |
| `ingredients` | 标准食材主数据 | 最小集 | 必须 | 扩充 |
| `ingredient_aliases` | 食材别名和多语言映射 | 最小集 | 必须 | 扩充 |
| `generation_requests` | 生成请求状态、幂等和总成本 | 最小实现 | 必须 | 必须 |
| `generation_attempts` | 每次模型调用尝试 | 可简化 | 必须 | 必须 |
| `recipes` | 菜谱主表和完整快照 | 可本地 | 必须 | 必须 |
| `recipe_ingredients` | 菜谱食材明细 | 可本地 | 必须 | 必须 |
| `recipe_steps` | 菜谱步骤明细 | 可本地 | 必须 | 必须 |
| `favorites` | 收藏关系 | 可延后 | 必须 | 必须 |
| `feedback` | 用户反馈和问题追踪 | 简化 | 必须 | 必须 |
| `food_safety_rules` | 版本化安全规则 | 最小集 | 必须 | 必须 |
| `recipe_safety_findings` | 每次规则命中结果 | 可嵌入 | 推荐 | 必须 |
| `nutrition_reference` | 标准营养参考 | 不要求 | 可选 | 必须 |
| `recipe_nutrition` | 当次菜谱营养计算快照 | 不要求 | 可选 | 必须 |

P0 是否使用云表取决于实现节奏，但 P0 的数据库实现不得采用与本设计冲突的临时结构。Mock 或本地数据不能伪装成云端能力。

---

## 8. 用户与偏好数据

### 8.1 `profiles`

### 职责

保存不属于 Auth 凭据的用户业务资料。认证邮箱、OAuth 身份和密码不复制到此表。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `id` | `uuid` | 否 | 与 `auth.users.id` 一一对应，同时为 PK |
| `display_name` | `text` | 是 | 可选昵称，不作为身份依据 |
| `locale` | `text` | 否 | BCP 47 语言标签，默认 `zh-CN` |
| `region_code` | `text` | 是 | ISO 3166-1 alpha-2，用于规则和单位展示 |
| `timezone` | `text` | 否 | IANA 时区，如 `Asia/Singapore` |
| `default_servings` | `smallint` | 否 | 默认份数，建议 1–20 |
| `onboarding_completed_at` | `timestamptz` | 是 | 完成引导时间 |
| `created_at` | `timestamptz` | 否 | 创建时间 |
| `updated_at` | `timestamptz` | 否 | 更新时间 |
| `deleted_at` | `timestamptz` | 是 | 账户删除流程中的业务软删除标记 |

### 约束

```sql
check (default_servings between 1 and 20)
check (char_length(locale) between 2 and 35)
check (region_code is null or region_code ~ '^[A-Z]{2}$')
```

### 设计说明

- `id` 直接引用 `auth.users(id)`，不再创建额外 `owner_id`；
- 不复制 email，避免 Auth 与业务表不同步；
- `timezone` 必须存 IANA 名称，不能只存 `+08:00`，因为夏令时地区偏移会变化；
- 删除 Auth 用户时，业务数据处理由账户删除流程控制，不能简单依赖一个级联删除完成全部合规要求。

---

### 8.2 `user_preferences`

### 职责

保存生成菜谱时可复用的默认约束。它不是医疗档案，不保存诊断、疾病治疗目标或不必要健康描述。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `owner_id` | `uuid` | 否 | PK + FK → `auth.users.id` |
| `dietary_pattern_codes` | `text[]` | 否 | 如 `vegetarian`，默认空数组 |
| `allergen_codes` | `text[]` | 否 | 标准过敏原代码，默认空数组 |
| `excluded_ingredient_codes` | `text[]` | 否 | 忌口或禁止食材代码 |
| `appliance_codes` | `text[]` | 否 | 可用厨具代码 |
| `preferred_cuisine_codes` | `text[]` | 否 | 偏好菜系，可为空 |
| `spice_level` | `smallint` | 是 | 0–5 |
| `difficulty_level` | `text` | 是 | `easy` / `medium` / `advanced` |
| `default_max_time_minutes` | `smallint` | 是 | 默认最大时间 |
| `nutrition_goal_code` | `text` | 是 | 一般饮食目标，不表示医疗建议 |
| `schema_version` | `text` | 否 | 偏好结构版本 |
| `created_at` | `timestamptz` | 否 | 创建时间 |
| `updated_at` | `timestamptz` | 否 | 更新时间 |

### 为什么首版允许数组

这些字段是“小规模、整体读取、整体覆盖”的用户配置，而不是高频跨用户统计主数据。对每个用户拆成多个关联表会增加写入和迁移复杂度，却没有足够查询收益。

允许数组的前提：

- 值必须来自共享代码表；
- 数组去重并限制最大长度；
- 服务端仍执行 Schema 校验；
- 若未来需要复杂查询或单项审计，再迁移到关系表；
- 不把自定义自由文本过敏描述直接放入数组。

### 约束建议

```sql
check (spice_level is null or spice_level between 0 and 5)
check (default_max_time_minutes is null or default_max_time_minutes between 5 and 1440)
check (cardinality(allergen_codes) <= 32)
check (cardinality(excluded_ingredient_codes) <= 100)
check (cardinality(appliance_codes) <= 50)
```

共享 Schema 还必须确保数组无重复值。PostgreSQL CHECK 不承担所有复杂业务校验。

---

## 9. 标准食材数据

### 9.1 `ingredients`

### 职责

保存跨语言稳定的标准食材实体，是过敏判断、食品安全、营养、搜索和统计的共同基础。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `id` | `uuid` | 否 | PK |
| `canonical_code` | `text` | 否 | 稳定机器代码，如 `egg_chicken_whole` |
| `canonical_name` | `text` | 否 | 默认业务名称，不等于所有语言显示名 |
| `category_code` | `text` | 否 | 标准分类代码 |
| `default_unit_code` | `text` | 是 | 默认展示单位 |
| `default_weight_grams` | `numeric(10,3)` | 是 | “1 个”等默认克重估算 |
| `allergen_group_codes` | `text[]` | 否 | 关联标准过敏原组 |
| `is_food` | `boolean` | 否 | 非食用品应为 false |
| `is_active` | `boolean` | 否 | 是否可用于新匹配 |
| `data_version` | `text` | 否 | 主数据版本 |
| `created_at` | `timestamptz` | 否 | 创建时间 |
| `updated_at` | `timestamptz` | 否 | 更新时间 |

### 关键约束

- `canonical_code` 全局唯一，发布后不因文案变化而修改；
- `default_weight_grams > 0`；
- 已被菜谱引用的食材不物理删除，只设 `is_active = false`；
- 非食用品也可存在于主数据，用于明确阻断清洁剂、药品等危险输入，但不能被标记为普通可用食材。

### 为什么机器代码与名称分离

名称会因为语言、地区和产品文案变化；机器代码承担长期外部契约。`番茄`、`西红柿`、`tomato` 可以映射到同一标准代码，但“圣女果”是否合并必须由业务主数据决定，不能靠字符串相似度自动处理。

---

### 9.2 `ingredient_aliases`

### 职责

将用户输入的各种名称映射到标准食材。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `id` | `uuid` | 否 | PK |
| `ingredient_id` | `uuid` | 否 | FK → `ingredients.id` |
| `alias` | `text` | 否 | 原始别名 |
| `normalized_alias` | `text` | 否 | 标准化后的匹配值 |
| `locale` | `text` | 否 | 如 `zh-CN` |
| `region_code` | `text` | 是 | 可选地区范围 |
| `alias_type` | `text` | 否 | `common` / `regional` / `brand` / `scientific` |
| `priority` | `smallint` | 否 | 同名候选排序 |
| `is_active` | `boolean` | 否 | 是否参与新匹配 |
| `created_at` | `timestamptz` | 否 | 创建时间 |
| `updated_at` | `timestamptz` | 否 | 更新时间 |

### 唯一性

建议唯一键：

```sql
unique (normalized_alias, locale, coalesce(region_code, ''))
```

PostgreSQL 普通唯一约束不能直接包含表达式，应使用唯一表达式索引：

```sql
create unique index uq_ingredient_aliases__normalized_locale_region
on ingredient_aliases (
  normalized_alias,
  locale,
  coalesce(region_code, '')
);
```

若同一别名在同一地区确实可能指向多个食材，不能强行唯一，应改为候选表设计并要求用户确认。首版优先维护无歧义主别名；歧义词进入专门测试集。

### 搜索策略

匹配顺序：

1. 规范化后精确匹配；
2. 当前 locale + region；
3. 当前 locale 无地区；
4. 可控的模糊候选；
5. 用户确认；
6. 保留自定义食材。

可在数据量增长后启用 `pg_trgm`：

```sql
create index idx_ingredient_aliases__trgm
on ingredient_aliases
using gin (normalized_alias gin_trgm_ops)
where is_active = true;
```

不要在没有真实慢查询证据时提前为每个文本字段建立 trigram 索引。

---

## 10. AI 生成生命周期

### 10.1 `generation_requests`

### 职责

保存一次用户生成意图的全生命周期，是幂等、状态、成本、错误、追踪和最终菜谱的权威记录。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `id` | `uuid` | 否 | 内部 PK |
| `request_id` | `uuid` | 否 | 对外追踪 ID，全局唯一 |
| `owner_id` | `uuid` | 是 | 已认证/匿名 Auth 用户 |
| `guest_subject_hash` | `text` | 是 | 无 Auth 临时会话的服务端哈希标识 |
| `idempotency_key` | `uuid` | 否 | 客户端一次生成动作的幂等键 |
| `status` | `text` | 否 | 状态机当前状态 |
| `input_schema_version` | `text` | 否 | 请求 Schema 版本 |
| `input_fingerprint` | `text` | 否 | 规范化请求的不可逆摘要 |
| `prompt_version` | `text` | 是 | 实际使用 Prompt 版本 |
| `provider_code` | `text` | 是 | 实际供应商代码 |
| `model_code` | `text` | 是 | 实际模型代码 |
| `recipe_id` | `uuid` | 是 | 成功后关联唯一结果，FK 在菜谱表创建后添加 |
| `attempt_count` | `smallint` | 否 | 已发起模型尝试次数 |
| `total_input_tokens` | `integer` | 否 | 总输入 Token |
| `total_output_tokens` | `integer` | 否 | 总输出 Token |
| `estimated_cost` | `numeric(14,6)` | 是 | 估算成本 |
| `cost_currency` | `char(3)` | 是 | ISO 4217 |
| `error_code` | `text` | 是 | 统一内部错误码 |
| `retryable` | `boolean` | 是 | 最终错误是否可重试 |
| `blocked_reason_code` | `text` | 是 | 安全或规则阻断原因分类 |
| `started_at` | `timestamptz` | 是 | 开始处理时间 |
| `completed_at` | `timestamptz` | 是 | 成功、失败、取消或阻断结束时间 |
| `created_at` | `timestamptz` | 否 | 创建时间 |
| `updated_at` | `timestamptz` | 否 | 更新时间 |
| `expires_at` | `timestamptz` | 是 | 临时 guest 请求或原始数据清理边界 |

### 身份约束

```sql
check (
  (owner_id is not null and guest_subject_hash is null)
  or
  (owner_id is null and guest_subject_hash is not null)
)
```

目标原则：所有云端请求都有可限流、可幂等但不暴露原始标识的 subject。`guest_subject_hash` 的签发和验证由 `05_AUTH_AND_IDENTITY.md` 与 `04_API_CONTRACT.md` 最终定义。正式 P1 优先使用 Supabase anonymous Auth，使 `owner_id` 非空。

### 幂等唯一索引

```sql
create unique index uq_generation_requests__owner_idempotency
on generation_requests (owner_id, idempotency_key)
where owner_id is not null;

create unique index uq_generation_requests__guest_idempotency
on generation_requests (guest_subject_hash, idempotency_key)
where guest_subject_hash is not null;
```

不能只在代码中先查再插，因为并发请求可能同时通过查询。唯一索引是最终防线。

### 状态机

允许状态：

```text
created
→ validating
→ generating
→ validating_output
→ completed

validating_output → retrying → generating
任意非终态 → failed / cancelled / blocked
```

终态：`completed`、`failed`、`cancelled`、`blocked`。

约束原则：

- `completed` 必须有 `recipe_id` 和 `completed_at`；
- `failed` 必须有 `error_code`；
- `blocked` 必须有 `blocked_reason_code`；
- `attempt_count` 不得超过服务端配置上限；
- 状态不能从终态回到处理中；
- 状态转换必须使用条件更新，避免并发覆盖。

示意：

```sql
update generation_requests
set status = 'generating',
    started_at = coalesce(started_at, now()),
    updated_at = now()
where id = :id
  and status in ('created', 'validating', 'retrying');
```

应用必须检查受影响行数。零行表示状态已变化或请求不存在，不能继续盲写。

### 为什么不保存完整原始输入

完整输入可能包含过敏、忌口和自由文本。请求表只保存完成追踪、复现和统计所需的版本、摘要、分类和用量。需要短期调试的结构化输入应：

- 明确白名单；
- 脱敏；
- 单独受限存储；
- 设置短保留期；
- 不作为长期默认字段。

---

### 10.2 `generation_attempts`

### 职责

一条 `generation_request` 可能因为输出格式修复或可重试供应商错误产生多次模型调用。若只在请求主表保存最终 provider、Token 和错误，就无法回答：

- 第一次为什么失败；
- 修复调用是否有效；
- 哪个模型产生了成本；
- 超时发生在哪次调用；
- 同一请求是否超出重试上限。

因此拆出尝试表。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `id` | `uuid` | 否 | PK |
| `generation_request_id` | `uuid` | 否 | FK |
| `attempt_number` | `smallint` | 否 | 从 1 开始 |
| `attempt_type` | `text` | 否 | `primary` / `repair` / `provider_retry` |
| `provider_code` | `text` | 否 | 供应商 |
| `model_code` | `text` | 否 | 模型 |
| `prompt_version` | `text` | 否 | Prompt 版本 |
| `status` | `text` | 否 | `started` / `succeeded` / `failed` / `timed_out` / `cancelled` |
| `input_tokens` | `integer` | 是 | 输入 Token |
| `output_tokens` | `integer` | 是 | 输出 Token |
| `estimated_cost` | `numeric(14,6)` | 是 | 本次成本 |
| `cost_currency` | `char(3)` | 是 | 币种 |
| `latency_ms` | `integer` | 是 | 调用耗时 |
| `provider_request_id_hash` | `text` | 是 | 供应商请求 ID 的哈希或脱敏值 |
| `error_class` | `text` | 是 | 归一化错误分类 |
| `provider_metadata` | `jsonb` | 否 | 严格白名单元数据，默认 `{}` |
| `started_at` | `timestamptz` | 否 | 开始时间 |
| `completed_at` | `timestamptz` | 是 | 结束时间 |
| `created_at` | `timestamptz` | 否 | 写入时间 |

### 约束和索引

```sql
unique (generation_request_id, attempt_number)
check (attempt_number between 1 and 5)
check (input_tokens is null or input_tokens >= 0)
check (output_tokens is null or output_tokens >= 0)
check (latency_ms is null or latency_ms >= 0)
```

实际业务上模型调用最多一次主调用 + 一次修复/重试，数据库上限可略高于产品配置，以便未来迁移，但服务端必须执行更严格上限。

### 原始模型输出

默认不在此表保存完整原始输出。若调试阶段确需保存，应使用独立受限存储或临时表，并满足：

- production 默认关闭；
- 字段级访问限制；
- 自动过期；
- 脱敏；
- 不进入普通日志和分析查询；
- 在 `12_PRIVACY_DATA_MAP.md` 中登记。

---

## 11. 菜谱数据

### 11.1 `recipes`

### 职责

保存一次已经通过 Schema、业务和食品安全校验的菜谱结果，以及稳定还原该结果所需的完整快照。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `id` | `uuid` | 否 | PK |
| `owner_id` | `uuid` | 否 | FK → `auth.users.id` |
| `schema_version` | `text` | 否 | Recipe Schema 版本 |
| `status` | `text` | 否 | `active` / `withdrawn`，与用户软删除分离 |
| `title` | `text` | 否 | 菜谱标题 |
| `description` | `text` | 是 | 简介 |
| `servings` | `smallint` | 否 | 份数 |
| `difficulty_code` | `text` | 否 | 难度代码 |
| `total_time_minutes` | `smallint` | 否 | 总时间 |
| `cuisine_code` | `text` | 是 | 菜系代码 |
| `safety_status` | `text` | 否 | `passed` / `warned` / `blocked_after_publish` |
| `nutrition_status` | `text` | 否 | `calculated` / `ai_estimated` / `unavailable` |
| `recipe_snapshot` | `jsonb` | 否 | 完整已校验展示快照 |
| `prompt_version` | `text` | 否 | 生成时 Prompt 版本 |
| `provider_code` | `text` | 否 | 生成供应商 |
| `model_code` | `text` | 否 | 生成模型 |
| `food_safety_ruleset_version` | `text` | 否 | 安全规则集版本 |
| `nutrition_calculation_version` | `text` | 是 | 营养计算版本 |
| `created_at` | `timestamptz` | 否 | 创建时间 |
| `updated_at` | `timestamptz` | 否 | 仅状态或元数据更新 |
| `deleted_at` | `timestamptz` | 是 | 用户软删除 |

### 核心约束

```sql
check (status in ('active', 'withdrawn'))
check (servings between 1 and 20)
check (total_time_minutes between 1 and 1440)
check (char_length(title) between 1 and 160)
check (jsonb_typeof(recipe_snapshot) = 'object')
```

### `status` 与 `deleted_at` 的区别

- `status = active`：结果可正常查看；
- `status = withdrawn`：因安全纠正、投诉处置或系统原因撤回，正文不再提供给普通用户；
- `deleted_at`：用户主动删除或账户清理状态。

一份菜谱只有通过完整校验后才写入，因此不在 `recipes` 中保存 `draft` 或 `validating`。处理中状态属于 `generation_requests`。

### 为什么保存 `recipe_snapshot`

关系表中的标准食材名称、单位转换、营养来源和规则会变化。用户历史必须展示当时经过校验的完整结果，而不是用最新主数据重新拼装出一个可能不同的菜谱。

Snapshot 必须：

- 与 `10_RECIPE_SCHEMA.md` 对应；
- 包含 `schemaVersion`；
- 不包含数据库内部字段、密钥或供应商原始响应；
- 在保存前通过共享 Schema；
- 与规范化食材和步骤在同一事务写入；
- 设置大小上限，例如应用层 256 KB，最终值由 API 契约确认。

### 为什么仍保留主表字段

`title`、`total_time_minutes`、`servings`、`safety_status` 等字段用于：

- 历史列表不读取大 JSON；
- 排序和筛选；
- 数据质量检查；
- 安全处置；
- 统计和性能。

它们是从已校验 Snapshot 投影出的受控冗余字段，写入后必须与 Snapshot 一致。

### 删除策略

用户删除菜谱时：

1. 设置 `deleted_at`；
2. 默认查询排除软删除；
3. 收藏关系同步删除或失效；
4. 进入延迟物理清理队列；
5. 账户删除流程按隐私策略执行更严格清理；
6. 安全、滥用或法定义务需要保留时，只保留最小必要的去标识记录。

软删除不是“永远不删”。最终周期将在 `12_PRIVACY_DATA_MAP.md` 中与产品政策对齐。

---

### 11.2 `recipe_ingredients`

### 职责

保存菜谱中可查询、可排序、可计算的食材行。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `id` | `uuid` | 否 | PK |
| `recipe_id` | `uuid` | 否 | FK → `recipes.id` |
| `line_number` | `smallint` | 否 | 展示顺序，从 1 开始 |
| `ingredient_id` | `uuid` | 是 | FK → `ingredients.id`，自定义食材可为空 |
| `display_name` | `text` | 否 | 当时展示名称 |
| `canonical_code_snapshot` | `text` | 是 | 当时标准代码快照 |
| `amount_value` | `numeric(12,3)` | 是 | 数量 |
| `unit_code` | `text` | 是 | 标准单位代码 |
| `estimated_weight_grams` | `numeric(12,3)` | 是 | 营养计算使用的估算克重 |
| `is_user_provided` | `boolean` | 否 | 是否来自用户已有食材 |
| `is_missing` | `boolean` | 否 | 是否为需要补充的食材 |
| `is_optional` | `boolean` | 否 | 是否可选 |
| `normalization_status` | `text` | 否 | `matched` / `custom` / `ambiguous_confirmed` |
| `normalization_confidence` | `numeric(5,4)` | 是 | 0–1，仅作解释，不替代规则 |
| `created_at` | `timestamptz` | 否 | 创建时间 |

### 约束

```sql
unique (recipe_id, line_number)
check (line_number > 0)
check (amount_value is null or amount_value > 0)
check (estimated_weight_grams is null or estimated_weight_grams > 0)
check (normalization_confidence is null or normalization_confidence between 0 and 1)
check (not (is_user_provided and is_missing))
```

### 为什么 `ingredient_id` 可以为空

用户可能输入尚未收录的自定义食材。系统可以在业务允许时保留原名，但必须：

- 标记为 `custom`；
- 不声称拥有可靠营养值；
- 食品安全无法确定时执行更严格策略；
- 不自动污染标准食材主数据；
- 后续运营审核后再建立标准映射。

### 删除行为

`recipe_ingredients` 对 `recipes` 使用 `ON DELETE CASCADE`，因为它是菜谱的组成部分，不具备独立生命周期。软删除菜谱时明细暂时保留；物理删除菜谱时级联删除。

---

### 11.3 `recipe_steps`

### 职责

保存有顺序、可计时、可进入烹饪模式的步骤。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `id` | `uuid` | 否 | PK |
| `recipe_id` | `uuid` | 否 | FK → `recipes.id` |
| `step_number` | `smallint` | 否 | 从 1 连续递增 |
| `instruction` | `text` | 否 | 步骤正文 |
| `duration_seconds` | `integer` | 是 | 可计时长度 |
| `timer_label` | `text` | 是 | 计时器显示文案 |
| `safety_note` | `text` | 是 | 当步安全提示快照 |
| `created_at` | `timestamptz` | 否 | 创建时间 |

### 约束

```sql
unique (recipe_id, step_number)
check (step_number > 0)
check (char_length(instruction) between 1 and 2000)
check (duration_seconds is null or duration_seconds between 1 and 86400)
```

数据库可以保证不重复和正数，但“步骤必须从 1 连续到 N”应由事务写入前的领域校验和测试保证。用复杂触发器强制连续性会增加批量插入和迁移成本。

### 为什么不把烹饪进度写入此表

步骤定义是菜谱内容，用户当前做到哪一步属于会话状态。首版烹饪进度优先保存在本地；未来云同步时使用独立 `cooking_sessions` 表，不能修改 `recipe_steps`。

---

## 12. 收藏与反馈

### 12.1 `favorites`

### 职责

表达“用户收藏菜谱”的多对多关系。

### 建议结构

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `owner_id` | `uuid` | 否 | FK → `auth.users.id` |
| `recipe_id` | `uuid` | 否 | FK → `recipes.id` |
| `created_at` | `timestamptz` | 否 | 收藏时间 |

主键：

```sql
primary key (owner_id, recipe_id)
```

不需要额外 UUID 主键，因为业务唯一性就是用户 + 菜谱。

### 所有权规则

用户只能收藏自己有权查看的菜谱。首版所有生成菜谱均为私有，因此通常要求：

```text
favorites.owner_id = recipes.owner_id
```

该跨表规则由服务端事务和测试保证。未来若增加公开菜谱，需要重新定义可见性模型，不能直接放宽现有 RLS。

### 删除行为

- 用户取消收藏：物理删除关系行；
- 菜谱物理删除：收藏级联删除；
- 用户删除账户：收藏级联清理。

收藏关系本身无需软删除。

---

### 12.2 `feedback`

### 职责

保存用户对具体生成结果或系统流程的反馈，并通过 `request_id` 定位问题。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `id` | `uuid` | 否 | PK |
| `owner_id` | `uuid` | 否 | FK → `auth.users.id` |
| `recipe_id` | `uuid` | 是 | 可选关联菜谱 |
| `generation_request_id` | `uuid` | 是 | 可选关联请求 |
| `category_code` | `text` | 否 | 如 `unsafe`, `incorrect`, `missing_ingredient`, `app_error` |
| `rating` | `smallint` | 是 | 可选 1–5 |
| `comment` | `text` | 是 | 用户文字，限制长度 |
| `context` | `jsonb` | 否 | 白名单客户端版本和页面信息 |
| `status` | `text` | 否 | `open` / `triaged` / `resolved` / `dismissed` |
| `severity` | `text` | 否 | 内部分类 |
| `created_at` | `timestamptz` | 否 | 提交时间 |
| `updated_at` | `timestamptz` | 否 | 处理时间 |
| `resolved_at` | `timestamptz` | 是 | 解决时间 |

### 约束

```sql
check (recipe_id is not null or generation_request_id is not null)
check (rating is null or rating between 1 and 5)
check (comment is null or char_length(comment) <= 4000)
```

安全举报必须优先处理，但普通用户不能读取内部 `severity`、处置备注或其他用户反馈。建议将内部处置记录放在后端专用表或受限字段中，而不是通过普通用户 API 返回。

---

## 13. 食品安全规则与命中结果

### 13.1 `food_safety_rules`

### 职责

保存可版本化、可回滚、可测试的确定性安全规则。Prompt 中的安全文字不是此表替代品。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `id` | `uuid` | 否 | PK |
| `rule_code` | `text` | 否 | 稳定规则代码 |
| `ruleset_version` | `text` | 否 | 规则集版本 |
| `risk_type` | `text` | 否 | 风险分类 |
| `severity` | `text` | 否 | `block` / `warn` / `info` |
| `blocking` | `boolean` | 否 | 是否阻断展示 |
| `ingredient_code` | `text` | 是 | 特定标准食材代码，可为空 |
| `condition` | `jsonb` | 否 | 规则 DSL 条件 |
| `warning_text_key` | `text` | 否 | 本地化文案键，不直接绑定单语言 |
| `region_code` | `text` | 是 | 地区范围 |
| `population_codes` | `text[]` | 否 | 儿童、孕妇等适用人群代码 |
| `source_name` | `text` | 否 | 来源名称 |
| `source_reference` | `text` | 是 | 内部引用或合规允许的来源标识 |
| `effective_from` | `timestamptz` | 否 | 生效时间 |
| `effective_to` | `timestamptz` | 是 | 失效时间 |
| `is_active` | `boolean` | 否 | 运营开关 |
| `created_at` | `timestamptz` | 否 | 创建时间 |
| `updated_at` | `timestamptz` | 否 | 更新时间 |

### 规则版本原则

- 已用于生产的规则内容不直接覆盖；
- 修改条件或严重性时创建新版本或新记录；
- 同一 `rule_code + ruleset_version` 唯一；
- 菜谱记录保存实际使用的 `food_safety_ruleset_version`；
- 规则发布前必须通过固定危险输入回归集；
- 规则表不允许普通 App 用户直接写入。

### JSON 条件 DSL

`condition` 不是任意代码，必须是共享 Schema 校验后的有限 DSL，例如：

```json
{
  "all": [
    { "field": "ingredient.canonicalCode", "operator": "eq", "value": "kidney_bean" },
    { "field": "step.minimumCookMinutes", "operator": "lt", "value": 10 }
  ]
}
```

禁止在数据库存储可执行 JavaScript、SQL 片段或动态表达式。规则解释器必须白名单字段和操作符。

---

### 13.2 `recipe_safety_findings`

### 职责

保存一次菜谱安全评估中实际命中的规则，便于解释、回归、举报定位和后续规则分析。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `id` | `uuid` | 否 | PK |
| `recipe_id` | `uuid` | 否 | FK → `recipes.id` |
| `rule_id` | `uuid` | 是 | FK → `food_safety_rules.id`；规则归档后可保留快照 |
| `rule_code_snapshot` | `text` | 否 | 当时规则代码 |
| `ruleset_version` | `text` | 否 | 当时规则集版本 |
| `severity` | `text` | 否 | 当时严重性 |
| `blocking` | `boolean` | 否 | 是否阻断 |
| `message_key` | `text` | 否 | 展示文案键 |
| `evidence` | `jsonb` | 否 | 最小化命中证据，不含完整敏感输入 |
| `created_at` | `timestamptz` | 否 | 评估时间 |

对被阻断且未保存为用户菜谱的候选结果，可将 finding 关联到 `generation_request_id` 的专用审计记录。首版可只在 `generation_requests.blocked_reason_code` 保存分类，P2 再持久化详细阻断结果。不得为了审计长期保存完整危险候选文本。

---

## 14. 营养参考与计算快照

### 14.1 `nutrition_reference`

### 职责

保存标准食材在特定来源、版本和计量基础下的营养参考值。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `id` | `uuid` | 否 | PK |
| `ingredient_id` | `uuid` | 否 | FK → `ingredients.id` |
| `source_code` | `text` | 否 | 数据来源代码 |
| `source_item_id` | `text` | 是 | 来源内部标识 |
| `source_version` | `text` | 否 | 数据版本 |
| `basis_grams` | `numeric(8,3)` | 否 | 通常 100g |
| `food_state_code` | `text` | 否 | `raw` / `cooked` / `prepared` |
| `energy_kcal` | `numeric(12,4)` | 是 | 能量 |
| `protein_g` | `numeric(12,4)` | 是 | 蛋白质 |
| `fat_g` | `numeric(12,4)` | 是 | 脂肪 |
| `carbohydrate_g` | `numeric(12,4)` | 是 | 碳水 |
| `fiber_g` | `numeric(12,4)` | 是 | 膳食纤维 |
| `sodium_mg` | `numeric(12,4)` | 是 | 钠 |
| `confidence_code` | `text` | 否 | 来源可信度分类 |
| `license_code` | `text` | 否 | 使用许可分类 |
| `effective_from` | `timestamptz` | 否 | 生效时间 |
| `effective_to` | `timestamptz` | 是 | 失效时间 |
| `created_at` | `timestamptz` | 否 | 导入时间 |

### 唯一性

```sql
unique (
  ingredient_id,
  source_code,
  source_version,
  food_state_code
)
```

营养来源和商业使用许可必须在导入前确认。无法确认许可的数据不得进入 production。

### 为什么不直接把营养值放在 `ingredients`

同一食材可能有：

- 多个来源；
- 不同版本；
- 生重与熟重；
- 地区差异；
- 许可差异；
- 不同置信度。

把一组值直接放在 `ingredients` 会丢失来源和版本，无法重算或审计。

---

### 14.2 `recipe_nutrition`

### 职责

保存当次菜谱计算出的营养快照，不在每次查看历史时重新使用最新参考数据计算。

### 建议字段

| 字段 | 类型 | Null | 说明 |
|---|---|---:|---|
| `recipe_id` | `uuid` | 否 | PK + FK → `recipes.id` |
| `source_status` | `text` | 否 | `database_calculated` / `ai_estimated` / `unavailable` |
| `confidence_code` | `text` | 否 | 总体置信度 |
| `calculation_version` | `text` | 否 | 算法版本 |
| `servings` | `smallint` | 否 | 计算份数 |
| `total_values` | `jsonb` | 否 | 整道菜标准营养结构 |
| `per_serving_values` | `jsonb` | 否 | 每份标准营养结构 |
| `estimated_ingredient_count` | `smallint` | 否 | 使用估算克重的食材数 |
| `unmatched_ingredient_count` | `smallint` | 否 | 无法匹配的食材数 |
| `created_at` | `timestamptz` | 否 | 计算时间 |

营养 JSON 必须有独立共享 Schema，字段集合固定，不能保存任意模型文本。

---

## 15. 外键与删除行为

### 15.1 基本原则

删除行为不能只为了“数据库干净”而统一使用 `CASCADE`。必须根据业务生命周期决定。

| 父表 → 子表 | 建议行为 | 原因 |
|---|---|---|
| `auth.users` → `profiles` | 受控删除流程 | 账户删除需协调多个表和保留例外 |
| `auth.users` → `user_preferences` | 受控删除/最终 CASCADE | 用户专属配置 |
| `auth.users` → `recipes` | 受控删除 | 先处理反馈、安全和保留策略 |
| `recipes` → `recipe_ingredients` | `ON DELETE CASCADE` | 组成部分，无独立生命周期 |
| `recipes` → `recipe_steps` | `ON DELETE CASCADE` | 组成部分 |
| `recipes` → `favorites` | `ON DELETE CASCADE` | 关系行 |
| `generation_requests` → `generation_attempts` | `ON DELETE CASCADE` 或同周期清理 | 尝试依赖请求 |
| `ingredients` → `ingredient_aliases` | `RESTRICT` / 停用 | 防止主数据误删 |
| `ingredients` → `recipe_ingredients` | `ON DELETE SET NULL` 或禁止物理删 | 历史菜谱保留显示快照 |
| `food_safety_rules` → findings | `ON DELETE SET NULL` | 保留命中快照 |

首版推荐不物理删除已被引用的 `ingredients` 和 `food_safety_rules`，使用 `is_active` / `effective_to` 管理生命周期。

### 15.2 账户删除不是单条 CASCADE

账户删除流程必须：

1. 验证用户身份；
2. 阻止新生成和写入；
3. 标记删除任务；
4. 删除或匿名化用户拥有数据；
5. 处理反馈、安全举报和法定保留例外；
6. 删除 Auth 身份；
7. 验证各表剩余数量；
8. 记录不含个人内容的完成结果；
9. 向用户提供明确状态。

详细流程在 `05_AUTH_AND_IDENTITY.md` 与 `12_PRIVACY_DATA_MAP.md` 确定。

---

## 16. 索引设计

### 16.1 原则

- 索引必须服务已知查询；
- 外键列不自动拥有索引，需按查询建立；
- 组合索引列顺序按过滤、排序和选择性决定；
- 使用部分索引排除软删除或非活动数据；
- 避免为每列建立单列索引；
- 写多读少日志表尤其要控制索引数量；
- 上线前使用真实查询和接近生产数据量执行 `EXPLAIN (ANALYZE, BUFFERS)`；
- 索引命名和原因写入迁移注释或文档。

### 16.2 核心索引建议

### 用户历史列表

典型查询：

```sql
select id, title, total_time_minutes, servings, safety_status, created_at
from recipes
where owner_id = :owner_id
  and status = 'active'
  and deleted_at is null
  and (created_at, id) < (:cursor_created_at, :cursor_id)
order by created_at desc, id desc
limit 20;
```

索引：

```sql
create index idx_recipes__owner_created_active
on recipes (owner_id, created_at desc, id desc)
where status = 'active' and deleted_at is null;
```

为什么联合索引而不是 `owner_id`、`created_at` 各一个：查询同时按 owner 过滤并按时间排序，联合索引可以直接提供有序结果，减少排序和回表。

### 请求追踪

```sql
create unique index uq_generation_requests__request_id
on generation_requests (request_id);

create index idx_generation_requests__owner_created
on generation_requests (owner_id, created_at desc)
where owner_id is not null;

create index idx_generation_requests__status_updated
on generation_requests (status, updated_at)
where status in ('created', 'validating', 'generating', 'validating_output', 'retrying');
```

最后一个部分索引用于查找超时或卡住请求，不包含历史终态数据。

### 菜谱食材和步骤

```sql
create unique index uq_recipe_ingredients__recipe_line
on recipe_ingredients (recipe_id, line_number);

create index idx_recipe_ingredients__ingredient_recipe
on recipe_ingredients (ingredient_id, recipe_id)
where ingredient_id is not null;

create unique index uq_recipe_steps__recipe_step
on recipe_steps (recipe_id, step_number);
```

### 收藏

主键 `(owner_id, recipe_id)` 已支持“用户是否收藏”和收藏列表。若存在按菜谱统计收藏数的真实需求，再增加 `(recipe_id)` 索引；P1 不提前为运营统计增加写放大。

### 活跃安全规则

```sql
create index idx_food_safety_rules__lookup_active
on food_safety_rules (
  ingredient_code,
  risk_type,
  region_code,
  effective_from
)
where is_active = true;
```

实际规则加载通常按 `ruleset_version` 一次性读取并缓存，可增加：

```sql
create index idx_food_safety_rules__ruleset_active
on food_safety_rules (ruleset_version, rule_code)
where is_active = true;
```

### 16.3 为什么历史列表使用 Keyset Pagination

`OFFSET 10000` 会扫描并丢弃前面的记录，而且当新数据插入时可能重复或跳过。历史和反馈列表使用稳定游标：

```text
(created_at, id)
```

`id` 作为时间相同情况下的稳定次序。API 不向用户暴露可伪造 SQL，而是编码和验证游标。

### 16.4 何时考虑分区

P0–P2 默认不分区。满足以下任一条件后评估：

- `generation_attempts` 或结构化日志达到数千万行；
- 保留周期按月清理成为主要负担；
- 查询绝大多数按时间范围；
- VACUUM 或索引维护出现可测量问题；
- 分区能明确改善归档和成本。

在没有规模证据时分区会增加迁移、RLS、唯一约束和运维复杂度。

---

## 17. Row Level Security 设计

### 17.1 总原则

- 所有暴露给 Supabase API 的用户表启用 RLS；
- 启用 RLS 后没有 Policy 即默认拒绝；
- 用户所有权统一使用 `auth.uid()`；
- Policy 同时约束 `USING` 和 `WITH CHECK`；
- 不能只限制 SELECT 而忘记 INSERT/UPDATE；
- 高权限后台操作也应通过明确函数或服务层，不在普通客户端使用 Service Role；
- RLS 是数据库最后防线，服务端仍需做身份、业务和字段校验；
- 每张表必须有用户 A/B 越权自动化测试。

虽然移动端主流程不直接操作数据库，RLS 仍必须开启，用于防止未来误接、服务端令牌错误或平台接口暴露造成越权。

### 17.2 `profiles` 示例

```sql
alter table public.profiles enable row level security;

create policy select_own_profile
on public.profiles
for select
using (id = auth.uid());

create policy update_own_profile
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());
```

Profile 创建建议由 Auth 触发器或受控服务完成。若使用触发器，函数必须固定 `search_path` 并最小化权限。

### 17.3 用户拥有表通用模式

```sql
alter table public.recipes enable row level security;

create policy select_own_recipes
on public.recipes
for select
using (
  owner_id = auth.uid()
  and status = 'active'
  and deleted_at is null
);
```

是否允许客户端直接 INSERT/UPDATE/DELETE 由架构边界决定。本项目主张 App 通过 API 服务，因此可只开放 SELECT，写操作由 Edge Function 受控执行。即使后端使用用户 JWT，也必须确保写入 `owner_id = auth.uid()`，不能接受客户端任意传 owner。

### 17.4 子表 Policy

`recipe_steps` 没有 `owner_id`，可通过父表 EXISTS 限制：

```sql
create policy select_steps_of_own_recipe
on public.recipe_steps
for select
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_steps.recipe_id
      and r.owner_id = auth.uid()
      and r.status = 'active'
      and r.deleted_at is null
  )
);
```

优点：不复制 owner。缺点：每次需要父表检查。若性能成为真实问题，可考虑在子表冗余 `owner_id`，但必须有约束或触发器保证一致，且先记录 ADR。首版不提前冗余。

### 17.5 参考数据 Policy

| 表 | 普通用户 SELECT | 普通用户 WRITE |
|---|---:|---:|
| `ingredients` | 可按产品需要开放只读 | 禁止 |
| `ingredient_aliases` | 通常通过 API 搜索，可不直开 | 禁止 |
| `food_safety_rules` | 不直接开放 | 禁止 |
| `nutrition_reference` | 不直接开放 | 禁止 |

安全规则和营养参考可能包含来源许可、内部条件和运营信息，不应直接向 App 暴露完整表。

### 17.6 RLS 常见错误

禁止以下写法或做法：

```sql
-- 错误：任何登录用户都能读所有行
using (auth.uid() is not null)
```

```sql
-- 错误：只写 USING，UPDATE 后可把 owner_id 改成别人
create policy update_recipe on recipes
for update using (owner_id = auth.uid());
```

其他错误：

- 通过请求体接收 `owner_id` 并直接写入；
- 把 Service Role Key 放在移动端；
- 使用 `SECURITY DEFINER` 但不固定 `search_path`；
- 为了测试临时关闭 RLS 后忘记恢复；
- 只用一个用户测试，未验证跨用户拒绝；
- 认为隐藏页面按钮等于权限控制。

---

## 18. 事务与并发

### 18.1 创建生成请求

创建请求必须在数据库唯一约束下实现“先插入，冲突读取”，而不是非原子的“先查后插”。

示意流程：

```text
BEGIN
  INSERT generation_requests
  ON CONFLICT identity + idempotency_key DO NOTHING
  SELECT existing/new row
COMMIT
```

若同一个幂等键对应不同的 `input_fingerprint`，返回幂等冲突错误，不能复用旧结果或再次计费。

### 18.2 保存成功菜谱

以下操作必须在同一事务：

1. 插入 `recipes`；
2. 插入全部 `recipe_ingredients`；
3. 插入全部 `recipe_steps`；
4. 插入安全 findings；
5. 插入营养快照（如可用）；
6. 更新 `generation_requests.recipe_id`；
7. 更新请求为 `completed`；
8. 提交。

任一步失败全部回滚，不能出现“请求显示完成但菜谱缺步骤”。

### 18.3 数据库写入失败后的重试

模型已经成功但数据库写入失败时，不得直接再次调用模型。正确流程：

- 根据 `request_id` / `idempotency_key` 查询请求；
- 若已有已校验结果的短期安全缓存，重试持久化；
- 若菜谱已存在，返回同一结果；
- 只有确认未产生有效模型结果且重试策略允许时，才再次调用；
- 记录重复计费防护指标。

### 18.4 收藏写入

收藏使用幂等 Upsert：

```sql
insert into favorites (owner_id, recipe_id)
values (:owner_id, :recipe_id)
on conflict (owner_id, recipe_id) do nothing;
```

取消收藏使用条件删除，不因记录不存在报系统错误。

---

## 19. 数据迁移规范

### 19.1 目录和命名

```text
supabase/migrations/
├── 202607240001_enable_extensions.sql
├── 202607240002_create_profiles.sql
├── 202607240003_create_ingredient_catalog.sql
├── 202607240004_create_generation_tables.sql
├── 202607240005_create_recipe_tables.sql
├── 202607240006_create_rls_policies.sql
└── ...
```

名称必须表达目的，不使用 `fix.sql`、`new.sql`、`final2.sql`。

### 19.2 强制规则

- 所有结构变化通过迁移；
- 已在共享环境执行的迁移不可修改；
- 纠错创建新迁移；
- 迁移必须能在空数据库完整执行；
- 必须测试从上一发布版本升级；
- seed 与 schema migration 分离；
- development、staging、production 使用同一迁移序列；
- production 不执行临时手工 DDL；
- 每次发布记录代码版本与数据库迁移版本；
- 破坏性迁移必须有备份、回滚或前向修复方案。

### 19.3 Expand–Contract 示例

需要把 `difficulty` 改为 `difficulty_code`：

### 发布 A：Expand

1. 新增 nullable `difficulty_code`；
2. 新代码同时兼容旧字段；
3. 新写入同时写两个字段或只写新字段并有兼容读取；
4. 后台回填；
5. 校验无空值和映射异常。

### 发布 B：切换

1. 所有活跃 App/API 使用新字段；
2. 监控旧字段读取；
3. 将新字段设为 NOT NULL；
4. 停止旧字段写入。

### 发布 C：Contract

1. 确认最低支持 App 版本不再使用旧字段；
2. 删除旧字段；
3. 更新共享 Schema 和文档；
4. 保留可追踪迁移记录。

不得在一个版本中直接 rename/drop 并假设所有客户端同时更新。

### 19.4 大表迁移

当表规模增大后：

- 避免一次事务更新全部行；
- 分批回填并记录游标；
- 对大表创建索引时评估 `CONCURRENTLY` 与平台迁移限制；
- 新增带默认值的非空列前评估锁和重写；
- 先加 nullable 列，回填，再加 NOT NULL；
- 迁移期间监控锁等待、错误率和延迟；
- 为失败准备前向修复，不假设所有 DDL 可安全回滚。

---

## 20. Seed、参考数据和环境隔离

### 20.1 Seed 分类

| 类型 | development | staging | production |
|---|---:|---:|---:|
| 标准食材最小集 | 是 | 是 | 是，受版本控制 |
| 食材别名 | 是 | 是 | 是，受版本控制 |
| 食品安全规则 | 是 | 是 | 是，需审核和版本 |
| 营养参考 | 可选 | 许可确认后 | 许可确认后 |
| 测试用户 | 是 | 是 | 禁止 |
| 假菜谱和反馈 | 是 | 是 | 禁止 |

### 20.2 参考数据发布

主数据和规则不能依赖手工后台逐条修改作为唯一流程。推荐：

1. 参考数据以版本化文件或受控管理工具维护；
2. CI 校验 Schema、重复代码和外键；
3. staging 导入并运行固定测试；
4. 生成差异报告；
5. 审核后部署 production；
6. 记录 `data_version` / `ruleset_version`；
7. 可回滚到上一版本。

### 20.3 环境隔离

- 三个环境使用独立 Supabase 项目或等价物理隔离；
- 不共享 Auth 用户；
- 不共享生产 AI Key；
- staging 不直接复制未脱敏生产数据；
- production 数据不得下载到个人开发机；
- 测试脚本必须显式校验环境，避免误删生产；
- 迁移先 development，再 staging，最后 production。

---

## 21. 数据生命周期与保留

以下是工程默认建议，最终必须与 `12_PRIVACY_DATA_MAP.md`、隐私政策、供应商条款和目标地区要求一致。

| 数据 | 默认生命周期 | 删除/归档原则 |
|---|---|---|
| `profiles` | 账户存在期间 | 账户删除时清理 |
| `user_preferences` | 账户存在期间 | 账户删除时清理 |
| 活跃菜谱 | 用户删除前 | 用户可删除 |
| 软删除菜谱 | 短暂恢复窗口 | 到期物理删除；账户删除可缩短 |
| 收藏 | 关系存在期间 | 取消收藏立即删除 |
| `generation_requests` 结构化记录 | 建议 90–180 天 | 到期删除或去标识聚合 |
| `generation_attempts` | 与请求相同或更短 | 保留成本和错误最小字段 |
| 原始模型输入/输出 | 默认不保存；调试时最短必要 | 自动过期、脱敏、受限访问 |
| 普通反馈 | 处理和质量改进所需周期 | 到期删除或去标识 |
| 安全举报 | 按处置与合规需要 | 严格访问控制，避免保存无关内容 |
| 食材、规则、营养参考 | 版本有效期 + 历史引用需要 | 停用而非删除 |
| 错误堆栈 | 建议 30–90 天 | 不含 Token、Key 和完整输入 |

### 21.1 软删除窗口

具体天数不在数据库硬编码。使用配置和清理任务，以便隐私政策变化时无需改表。数据库只存 `deleted_at`。

### 21.2 去标识聚合

业务分析长期需要的指标应转为聚合数据，例如：

- 每日生成数量；
- Schema 失败率；
- 模型成本；
- 安全 BLOCK 数量；
- P50/P95 时长。

聚合数据不应保留可回推到个人的 requestId、完整食材或自由文本。

### 21.3 清理任务

清理任务必须：

- 幂等；
- 分批执行；
- 记录数量而非内容；
- 有失败重试；
- 不绕过保留例外；
- 在 staging 验证；
- 对异常删除量报警。

---

## 22. 备份、恢复与灾难恢复

### 22.1 目标

发布前应定义并验证：

- RPO：最多可接受丢失多少数据；
- RTO：故障后多久恢复主要服务；
- 可恢复对象：Schema、用户数据、参考数据、Secrets 配置；
- 谁能发起恢复；
- 恢复后如何验证 RLS 和应用兼容。

建议初始目标：

- production 用户业务数据 RPO 不高于 24 小时；
- 主要读取能力 RTO 4 小时内；
- 正式发布后根据用户量和商业影响提高要求。

这些是目标，不代表当前 Supabase 套餐已满足。实施时必须验证供应商实际备份和 PITR 能力。

### 22.2 最低要求

- 使用平台支持的自动备份；
- 重要发布前创建可恢复点或等价备份；
- 定期做恢复演练，而不只确认“有备份”；
- 参考数据源文件保存在版本控制；
- 数据库迁移可从空库重建 Schema；
- Secrets 不进入数据库 dump 或 Git；
- 恢复到隔离环境后执行完整迁移、RLS 和主流程测试；
- 记录恢复操作和验证结果。

### 22.3 备份不是迁移回滚的唯一方案

生产 DDL 可能无法通过恢复整个数据库来快速回滚，因为恢复会覆盖期间的新用户数据。迁移设计应优先向后兼容和前向修复。全库恢复用于灾难场景，不是日常字段改错的首选。

---

## 23. 性能与容量设计

### 23.1 初始规模假设

P0–P2 目标是小规模内测和早期商店用户，不为百万级用户提前设计微服务和复杂分片。数据库应支持：

- 每用户数百到数千份菜谱历史；
- 日生成请求从百级增长到万级；
- 标准食材和别名从千级增长到十万级；
- 结构化请求/尝试日志按保留周期清理；
- 历史列表 P95 在正常网络和 API 开销之外保持可接受。

这些是假设，真实容量由监控更新。

### 23.2 查询预算

开发阶段为以下路径建立可测量目标：

- 历史第一页：单个主查询，不扫描其他用户数据；
- 菜谱详情：主表 + 食材 + 步骤 + 必要安全/营养数据；
- 收藏列表：Keyset pagination；
- 食材精确搜索：索引命中；
- 生成幂等查询：唯一索引命中；
- 卡住请求扫描：部分索引命中。

不要用 ORM 自动产生的 N+1 查询拼装详情。Repository 层应明确查询计划，并用集成测试检查数量。

### 23.3 Snapshot 大小

`recipe_snapshot` 是高价值但可能膨胀的字段：

- 限制步骤、食材、提示和文本长度；
- API 层限制请求/响应体；
- 历史列表不得选择 Snapshot；
- 详情按需读取；
- 监控平均和 P95 Snapshot 字节数；
- 不在 Snapshot 嵌入 Base64 图片；
- 未来图片只保存对象存储引用。

### 23.4 连接和 Edge Runtime

Edge Function 访问 PostgreSQL 时必须使用平台推荐的连接方式和池化策略。不得在每次请求创建无法复用的大量长连接。实施阶段需根据 Supabase 当前运行环境验证连接池、事务和超时配置。

---

## 24. 安全细节

### 24.1 Secrets 和 Token

数据库中禁止保存：

- AI Provider API Key；
- Supabase Service Role Key；
- 用户密码；
- 明文 Access Token / Refresh Token；
- 第三方 OAuth Secret；
- 构建签名密钥。

只允许保存供应商请求 ID 的哈希或脱敏版本，用于支持排查。

### 24.2 SQL 函数

使用 `SECURITY DEFINER` 时：

- 只有确有必要才使用；
- 固定 `search_path`；
- 明确 schema 限定表名；
- 检查调用者身份；
- 撤销 public execute，再按角色授权；
- 不拼接未经校验的动态 SQL；
- 建立单元和越权测试；
- 在文档中记录函数为什么需要提权。

示意：

```sql
create or replace function public.example_secure_function()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  -- 明确业务逻辑
end;
$$;

revoke all on function public.example_secure_function() from public;
```

### 24.3 敏感偏好

过敏原属于高敏感业务信息。首版通过：

- 最小字段；
- 用户所有权 RLS；
- 服务端访问控制；
- 日志脱敏；
- 不用于广告；
- 不发送无关个人标识给模型；
- 账户删除；
- 权限和审计测试；

来降低风险。是否需要应用层字段加密取决于目标地区、威胁模型和查询需求，在隐私与安全评审中决定。不能为了“看起来更安全”引入无法检索、无法轮换或把密钥放在客户端的伪加密。

---

## 25. 数据库与共享 Schema 的映射

### 25.1 三层对象分离

同一概念可能有三个对象，但必须明确映射：

1. **API DTO**：面向客户端、无内部字段；
2. **Domain Entity**：业务规则使用；
3. **Database Row**：持久化字段和关系。

禁止把数据库行直接 `select *` 返回给 App。

示例：

```text
recipes.recipe_snapshot     → RecipeResponse
recipes.owner_id            → 不返回
recipes.provider_code       → 默认不返回或仅内部调试
recipe_ingredients          → RecipeIngredient DTO
recipe_steps                → RecipeStep DTO
```

### 25.2 字段变更顺序

任何共享字段变更：

1. 在 `10_RECIPE_SCHEMA.md` 或请求 Schema 提案；
2. 判断是否破坏兼容；
3. 更新数据库设计和迁移计划；
4. 更新 API Contract；
5. 更新 Domain/Shared Schema；
6. 实施迁移；
7. 更新后端；
8. 更新 App；
9. 运行契约测试和旧版本兼容测试；
10. 更新 CHANGELOG 和 DECISIONS（若是重大决策）。

数据库列名不必与用户文案一致，但与 API/Domain 的映射必须明确且有测试。

---

## 26. 可观测性与审计

### 26.1 必须可回答的问题

数据库结构应支持回答：

- 某个 requestId 当前处于什么状态；
- 是否发生重复提交或重复模型计费；
- 哪个 provider/model/prompt 产生结果；
- 使用了哪个 Recipe Schema 和安全规则版本；
- Schema、业务或安全校验在哪一层失败；
- 一次请求用了多少 Token、耗时和估算成本；
- 用户反馈关联哪个菜谱和请求；
- 某次迁移或规则发布后指标是否恶化。

### 26.2 不建立“全量审计一切”的万能表

万能 audit 表容易保存大量敏感 before/after JSON，并产生高成本。首版采用：

- 业务表必要时间和状态；
- generation request/attempt 结构化追踪；
- 规则版本和 finding；
- 迁移记录；
- 外部监控的脱敏错误事件；
- 对高权限后台操作的专门审计。

只有明确威胁和合规需求时，再增加通用审计扩展。

---

## 27. 数据库测试计划

### 27.1 测试层级

| 层级 | 目标 |
|---|---|
| Schema 测试 | 表、列、类型、默认值、约束存在 |
| Migration 测试 | 空库执行、上一版本升级、重复部署防护 |
| Constraint 测试 | 非法份数、重复步骤、错误所有权等被拒绝 |
| RLS 测试 | 用户 A/B、匿名、未登录、后台角色权限 |
| Transaction 测试 | 菜谱保存部分失败时整体回滚 |
| Idempotency 测试 | 并发同 Key 只创建一次请求 |
| Integration 测试 | Edge Function + Auth + DB + 模型 Mock |
| Performance 测试 | 关键查询使用预期索引、无 N+1 |
| Retention 测试 | 清理任务只删除到期数据 |
| Restore 测试 | 备份恢复后迁移和主流程可用 |

### 27.2 RLS 最低测试矩阵

| 场景 | 预期 |
|---|---|
| 用户 A 读取自己的 recipe | 允许 |
| 用户 A 读取用户 B recipe | 拒绝/无结果 |
| 用户 A 修改 owner_id 为 B | 拒绝 |
| 用户 A 读取自己 recipe_steps | 允许 |
| 用户 A 读取 B 的 steps | 拒绝 |
| 未登录读取私有 recipe | 拒绝 |
| 用户写安全规则 | 拒绝 |
| 后端受控服务写 recipe | 允许并校验 owner |
| 软删除 recipe 后普通查询 | 不返回 |
| 直接猜测 UUID | 不泄露存在性和内容 |

### 27.3 幂等并发测试

至少并发发送 10 个相同：

```text
subject + idempotencyKey + inputFingerprint
```

预期：

- 只有一条 `generation_requests`；
- 只有允许次数的模型调用；
- 所有调用获得同一 requestId/状态；
- 不重复写菜谱；
- 不重复计费。

同一 Key 但不同 fingerprint：返回 `IDEMPOTENCY_CONFLICT`，不复用旧结果。

### 27.4 迁移测试

每次 CI 至少执行：

1. 从空库应用全部迁移；
2. 载入最小 seed；
3. 运行 Schema 和 RLS 测试；
4. 从上一发布数据库快照升级；
5. 验证旧版本读取路径；
6. 输出 migration diff；
7. 检查是否存在危险 DROP、无条件大表 UPDATE 或关闭 RLS。

---

## 28. 推荐的初始 DDL 骨架

以下仅用于表达结构，不是可直接部署的最终迁移。正式 SQL 必须拆分、补全约束、RLS、注释和测试。

```sql
create table public.profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  locale text not null default 'zh-CN',
  region_code text,
  timezone text not null default 'UTC',
  default_servings smallint not null default 1,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint ck_profiles__default_servings
    check (default_servings between 1 and 20)
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  canonical_code text not null unique,
  canonical_name text not null,
  category_code text not null,
  default_unit_code text,
  default_weight_grams numeric(10,3),
  allergen_group_codes text[] not null default '{}',
  is_food boolean not null default true,
  is_active boolean not null default true,
  data_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_ingredients__positive_default_weight
    check (default_weight_grams is null or default_weight_grams > 0)
);

create table public.generation_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  owner_id uuid references auth.users(id),
  guest_subject_hash text,
  idempotency_key uuid not null,
  status text not null,
  input_schema_version text not null,
  input_fingerprint text not null,
  prompt_version text,
  provider_code text,
  model_code text,
  recipe_id uuid unique,
  attempt_count smallint not null default 0,
  total_input_tokens integer not null default 0,
  total_output_tokens integer not null default 0,
  estimated_cost numeric(14,6),
  cost_currency char(3),
  error_code text,
  retryable boolean,
  blocked_reason_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint ck_generation_requests__single_subject
    check (
      (owner_id is not null and guest_subject_hash is null)
      or
      (owner_id is null and guest_subject_hash is not null)
    )
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  schema_version text not null,
  status text not null default 'active',
  title text not null,
  description text,
  servings smallint not null,
  difficulty_code text not null,
  total_time_minutes smallint not null,
  cuisine_code text,
  safety_status text not null,
  nutrition_status text not null,
  recipe_snapshot jsonb not null,
  prompt_version text not null,
  provider_code text not null,
  model_code text not null,
  food_safety_ruleset_version text not null,
  nutrition_calculation_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint ck_recipes__status check (status in ('active', 'withdrawn')),
  constraint ck_recipes__servings check (servings between 1 and 20),
  constraint ck_recipes__total_time check (total_time_minutes between 1 and 1440),
  constraint ck_recipes__snapshot_object check (jsonb_typeof(recipe_snapshot) = 'object')
);

alter table public.generation_requests
add constraint fk_generation_requests__recipe_id
foreign key (recipe_id) references public.recipes(id);
```

生成请求到菜谱只保留 `generation_requests.recipe_id → recipes.id` 单向关联，并对 `recipe_id` 建立唯一约束。这样可以直接从 request 找到结果，又不会因为双向外键产生两列不一致。菜谱反查生成请求时通过 `generation_requests.recipe_id` 查询。未来人工或系统导入的菜谱可以没有生成请求。

---

## 29. 实施顺序

建议按以下顺序创建迁移，避免过早引入后续模块：

### Phase DB-0：基础

1. 必要扩展；
2. 通用 updated_at 函数；
3. schema 权限和角色检查；
4. migration 测试框架。

### Phase DB-1：用户与食材

1. `profiles`；
2. `user_preferences`；
3. `ingredients`；
4. `ingredient_aliases`；
5. 最小 seed；
6. RLS 和参考数据权限。

### Phase DB-2：生成与菜谱

1. `generation_requests`；
2. `generation_attempts`；
3. `recipes`；
4. `recipe_ingredients`；
5. `recipe_steps`；
6. 幂等索引；
7. 保存事务集成测试。

### Phase DB-3：历史、收藏和反馈

1. `favorites`；
2. `feedback`；
3. 历史 Keyset 索引；
4. RLS A/B 测试；
5. 软删除和清理任务。

### Phase DB-4：安全和营养

1. `food_safety_rules`；
2. `recipe_safety_findings`；
3. `nutrition_reference`；
4. `recipe_nutrition`；
5. 规则/营养版本；
6. 许可和数据来源审核。

每一阶段独立退出，不一次创建所有未来表。

---

## 30. 需要后续文档锁定的接口

本文已经锁定数据库方向，但以下细节由后续专项共同完成：

| 待锁定项 | 上游/下游文档 |
|---|---|
| guest 临时 subject 的签发和生命周期 | `05_AUTH_AND_IDENTITY.md` |
| `Idempotency-Key` 作用域和过期 | `04_API_CONTRACT.md` |
| 请求与响应字段的完整定义 | `04_API_CONTRACT.md` |
| Recipe Snapshot 精确 Schema | `10_RECIPE_SCHEMA.md` |
| Prompt、provider、repair 尝试语义 | `06_AI_ENGINE.md`, `07_PROMPT_ENGINEERING.md` |
| 业务规则 finding 结构 | `08_RULE_ENGINE.md` |
| 安全 DSL、规则来源和发布流程 | `09_FOOD_SAFETY_RULES.md` |
| 营养 JSON 和来源许可 | `11_NUTRITION_ENGINE.md` |
| 精确保留周期与账户删除 SLA | `12_PRIVACY_DATA_MAP.md` |

后续文档只能补充细节，不能未经 ADR 推翻以下已锁定基线：

- PostgreSQL + RLS；
- 用户数据 owner 绑定；
- 标准食材与别名分离；
- generation request/attempt 分层；
- recipes + ingredients + steps 规范化；
- 通过校验的 Recipe Snapshot；
- 幂等唯一约束；
- 安全规则版本化和失败关闭；
- 营养来源与计算版本可追踪；
- 所有结构变化通过迁移。

---

## 31. 开放问题

以下问题不阻断数据库文档成立，但必须在实施前关闭：

1. P0 真实 AI 生成是否静默创建 Supabase anonymous Auth，还是使用短期 guest subject；
2. Recipe Snapshot 最终大小上限；
3. 是否需要在 P1 保存详细 `recipe_safety_findings`，或仅保存规则摘要；
4. 营养数据源、地区、许可和更新频率；
5. 软删除恢复窗口和物理删除周期；
6. feedback 内部处置是否拆分为单独后台表；
7. 是否需要未来云端 `cooking_sessions`；
8. 生产套餐是否支持满足目标的备份/PITR；
9. 结构化请求日志的最终保留期；
10. 供应商请求 ID 是否允许保存哈希，及其支持价值。

关闭这些问题时应更新对应专项文档；若改变核心基线，新增 DECISIONS ADR。

---

## 32. Definition of Done

`03_DATABASE_DESIGN.md` 对应的数据库实现只有在以下条件全部满足后，才可标记完成：

- [ ] 所有 P1 必需表都有版本化 migration；
- [ ] migrations 可从空库执行；
- [ ] 上一版本到当前版本升级测试通过；
- [ ] 所有用户表启用 RLS；
- [ ] 用户 A/B 越权测试通过；
- [ ] Service Role Key 未进入 App 或 Git；
- [ ] 幂等并发测试证明只创建一次请求；
- [ ] 菜谱、食材、步骤、finding 和请求状态在同一事务保持一致；
- [ ] Recipe Snapshot 通过共享 Schema；
- [ ] 历史和收藏查询有稳定分页与索引；
- [ ] 食材别名精确匹配和歧义测试通过；
- [ ] 安全规则版本和规则集可回滚；
- [ ] 营养来源与许可已确认后才导入 production；
- [ ] 账户删除和保留策略与隐私文档一致；
- [ ] staging 使用接近真实规模验证迁移；
- [ ] 备份恢复演练通过；
- [ ] 文档、Schema、API、代码和 CHANGELOG 同步更新；
- [ ] 提供失败回滚或前向修复方案；
- [ ] 未执行的测试不得写成 PASS。

---

## 33. 数据库实施交接模板

```markdown
任务：
目标迁移：
数据库环境：development / staging / production
当前 migration 版本：
允许修改：
禁止修改：
涉及表：
涉及 RLS：
是否破坏兼容：
是否需要 backfill：
预计锁表风险：
备份/恢复点：
部署顺序：
代码兼容版本：
验证 SQL：
自动化测试：
回滚或前向修复：
实际执行结果：
```

---

## 34. 结论

AI Kitchen 的数据库不只是“把 AI 结果存下来”。它承担用户数据所有权、生成幂等、结构化菜谱、标准食材、安全版本、营养来源、成本追踪和长期兼容。

本设计采用关系规范化与不可变 Recipe Snapshot 并存：

- 关系表保证查询、约束和统计；
- Snapshot 保证历史可还原；
- generation request/attempt 保证请求与成本可追踪；
- RLS 保证用户隔离；
- 版本化规则和营养来源保证可审计；
- migration、测试和备份保证系统可持续修改。

在此基线上，未来增加拍照识别、周菜单、购物清单、多语言和家庭共享时，可以扩展新的输入、关系和工作流，而不需要推翻菜谱、食材、身份与安全的核心数据模型。
