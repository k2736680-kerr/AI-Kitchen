# 18 — Test Strategy

> 本文定义 AI Kitchen 从纯函数到真机发布的测试金字塔、AI 评估、食品安全门禁、数据权限、性能和回归策略。测试结果必须是真实执行证据，不接受“代码看起来正确”。

| 属性 | 内容 |
|---|---|
| 文档状态 | Draft / Ready for Test Planning |
| 实施状态 | 尚未建立测试框架、设备矩阵和 CI |
| 依赖 | 全部核心技术文档 |
| 最后更新 | 2026-07-27 |

---

## 1. 质量目标

- 核心流程无阻断崩溃；
- 共享 Schema 和 API 契约一致；
- 过敏与明确危险测试零放行；
- 用户 A/B 数据不可越权；
- 相同幂等请求不重复计费；
- 网络失败、后台和重启可恢复；
- 数据迁移不丢失；
- Android 真机稳定；
- 发布版本可监控和回滚。

---

## 2. 测试层级

| 层级 | 对象 | 速度 | 数量 |
|---|---|---|---|
| Static | TypeScript、Lint、依赖、Secrets | 最快 | 每次提交 |
| Unit | Schema、Mapper、规则、计算、状态机 | 快 | 多 |
| Component | UI 组件和页面状态 | 快/中 | 多 |
| Integration | API、DB、Auth、Local DB、Provider Mock | 中 | 适量 |
| Contract | App/API/Schema、错误码 | 中 | 必需 |
| AI Evaluation | 固定输入、多模型/Prompt | 中/慢 | 每次相关变更 |
| E2E | 核心用户路径 | 慢 | 少而稳定 |
| Device/Release | 真机、构建、升级、弱网 | 最慢 | 发布门禁 |

E2E 不替代单元测试，Snapshot 不替代业务断言。

---

## 3. 静态门禁

- TypeScript strict；
- format/lint；
- import boundary；
- unused/dead code；
- dependency audit；
- Secret scanning；
- SQL migration lint；
- OpenAPI/Schema generation diff；
- Markdown links/code fences；
- License check；
- prohibited client keys scan。

任何 Secret 扫描命中、类型错误或破坏性 migration 未说明，禁止合并。

---

## 4. 单元测试

### Domain

- Recipe Schema；
- cross-field invariants；
- ingredient normalization；
- Rule Engine；
- Food Safety；
- Nutrition；
- unit conversion；
- error mapping；
- state machines；
- sync conflict；
- timer calculations。

测试使用固定 clock、UUID 和 provider，保证可重复。

---

## 5. API 与契约

每个 endpoint 覆盖：

- 正常请求；
- 字段边界；
- 未登录/匿名/注册；
- 401/403；
- 404；
- 409 幂等冲突；
- 422 安全/业务；
- 429；
- 5xx；
- Envelope 和 requestId；
- 新旧客户端兼容；
- cursor 分页。

共享 Zod 与 OpenAPI 输出建立 golden contract，breaking change 必须显式版本升级。

---

## 6. 数据库与 RLS

至少创建 userA、userB、anonymous、service test identities：

- A 只能 CRUD 自己数据；
- B 无法通过直接 SQL/Data API/API 读取 A；
- owner_id 不能由客户端伪造；
- favorites/feedback/recipes 关联正确；
- service role 仅服务端测试；
- soft delete 和账户删除；
- unique idempotency；
- transaction rollback；
- migration up/rollback/forward fix；
- explain/index 性能。

RLS 测试是发布阻断，不能只在 UI 层测试。

---

## 7. AI Evaluation

### 7.1 数据集

固定类别：

- 标准家常菜；
- 单食材；
- 少厨具；
- 10 分钟限制；
- 人数变化；
- 过敏/忌口；
- 危险非食物；
- 未知食材；
- Prompt 注入；
- 非 JSON/缺字段；
- 重复步骤；
- 营养不可计算；
- 多语言/乱码边界。

### 7.2 指标

- parse success；
- Candidate Schema success；
- Final Recipe success；
- rule block/warn；
- 约束遵守；
- 可执行性；
- Token/成本；
- latency；
- repair/retry rate；
- unsafe false negative/positive。

### 7.3 评估方法

确定性检查优先。LLM-as-judge 只能辅助可读性和创意，不能裁决过敏和食品安全。评估 prompt/model/version 都要记录。

---

## 8. 食品安全测试

硬门禁：

- 每个 allergen group；
- 隐藏过敏原；
- 步骤与清单不一致；
- 可选/替代食材；
- 生食、加热、交叉污染；
- 非食用物；
- 野生未知；
- 规则服务超时/缺失；
- 模型声称安全；
- 已发布 Recipe 撤回。

已知 BLOCK 被展示一次即失败。测试同时检查日志脱敏和未重复计费。

---

## 9. 移动端组件测试

- 页面 loading/empty/error/success；
- 表单校验；
- 生成按钮禁用；
- request 恢复；
- safety UI；
- nutrition unavailable；
- 动态字体；
- accessible name/state；
- keyboard；
- dialog/back；
- timer controls；
- account switch。

Mock 在 API/Repository 边界，不 mock 组件内部实现细节。

---

## 10. E2E 核心路径

P0：

1. 启动→选择食材→条件→固定 Recipe；
2. 真实 API 成功；
3. 超时恢复；
4. 错误重试；
5. 本地历史；
6. 烹饪进度重启恢复。

P1/P2：

- anonymous→registered；
- 云端历史/收藏；
- 账号切换；
- 过敏 BLOCK；
- 反馈 requestId；
- 账户删除；
- deep link；
- app update/migration。

E2E 数据独立、可清理、环境固定，禁止依赖生产。

---

## 11. 真机与兼容矩阵

维度：

- Android API、厂商、内存、屏幕；
- iOS 版本和尺寸；
- Wi-Fi/4G/弱网/断网；
- 前后台和系统回收；
- 字体大小、语言、深色模式；
- 通知允许/拒绝；
- 冷启动/热启动；
- 旧版本升级；
- 低磁盘；
- 系统时间变化。

每个发布候选保存设备、OS、build、结果和证据。

---

## 12. 性能测试

目标需在实施后基于设备确认，至少测：

- cold/warm start；
- 首页可交互；
- 搜索和长列表；
- Recipe 详情渲染；
- Local DB migration；
- sync；
- generation API P50/P95；
- rule/nutrition duration；
- memory；
- JS/UI frame；
- 电量（计时器/常亮）。

不能只在高性能模拟器上确定目标。

---

## 13. 安全测试

- Secrets 不在 bundle/repo/log；
- Auth Token 存储；
- API 授权；
- RLS；
- rate limit；
- idempotency；
- Prompt injection；
- 输入长度；
- deep link；
- external URL；
- dependency vulnerabilities；
- admin access；
- data export/delete；
- environment isolation。

正式渗透测试范围按 P2 风险和预算决定，但基础测试从 P0 开始。

---

## 14. 隐私测试

- AI payload 最小化；
- 日志 redaction；
- crash breadcrumbs；
- analytics event payload；
- user switch cache；
- account deletion；
- retention cleanup；
- staging no prod data；
- permissions；
- store disclosure vs SDK scan。

---

## 15. 测试数据

- 合成数据为主；
- 固定 UUID/clock；
- seed version；
- 每个 test namespace 隔离；
- 自动清理；
- 不把真实用户数据提交 Git；
- AI cases 脱敏；
- 数据源许可；
- 失败 case 进入回归集。

---

## 16. CI 分层

### Pull Request

- static；
- unit；
- component；
- contract；
- migration validate；
- selected AI mock/eval；
- build config validation。

### Main/Staging

- integration；
- RLS；
- full AI eval（可按成本计划）；
- EAS preview build；
- E2E；
- security scan。

### Release

- staging smoke；
- full safety set；
- upgrade/migration；
- device matrix；
- store checks；
- rollback rehearsal；
- release approval。

---

## 17. Flaky Test Policy

- flaky 不是“重跑直到绿”；
- 自动重试只用于收集证据，最终需登记；
- 标记 owner、首次出现、影响；
- 安全/RLS/幂等测试不得长期 quarantine；
- 超过门限阻止新增 E2E；
- 每周清理；
- 记录设备、网络和日志。

---

## 18. Bug Severity

| 等级 | 示例 | 发布行为 |
|---|---|---|
| P0 | 数据越权、过敏放行、Key 泄漏、主要流程崩溃 | 禁止发布 |
| P1 | 生成/登录/删除大面积失败 | 通常禁止发布 |
| P2 | 可恢复功能错误、部分设备问题 | 评估/修复计划 |
| P3 | 轻微视觉/文案 | 可延期 |

安全和隐私问题不因发生概率低而自动降级。

---

## 19. 完成证明

AI 或开发者报告必须写：

- 执行命令；
- 环境；
- 测试数量；
- 通过/失败/跳过；
- 真实设备；
- 未执行内容；
- artifact/日志位置；
- 已知风险。

禁止写“应该没问题”“理论上通过”。

---

## 20. 发布门禁

以下任一存在则禁止：

- 过敏/危险 case 放行；
- RLS 越权；
- production Key 进入客户端；
- 幂等失败重复计费；
- 账户无法删除；
- 主要迁移丢数据；
- crash-free 低于批准门限；
- 无法回滚；
- 隐私申报与实际不一致；
- 关键测试未运行却标记通过。

---

## 21. Definition of Done

- [ ] 测试层级、工具和 owner 确认；
- [ ] PR/Main/Release CI 建立；
- [ ] Schema/API/RLS/幂等自动化；
- [ ] AI 固定数据集和报告；
- [ ] 食品安全零放行门禁；
- [ ] 移动端核心 E2E 稳定；
- [ ] 真机矩阵和升级测试；
- [ ] 隐私/安全测试；
- [ ] flaky policy 执行；
- [ ] 发布证明可追溯。

---

## 22. 当前结论

AI Kitchen 的测试重点不是 UI 点击数量，而是跨层不变量：所有权、安全、幂等、版本、迁移和恢复。自动化应把高风险门禁前移；真机、AI 评估和食品安全回归不能在最后一周才开始。
