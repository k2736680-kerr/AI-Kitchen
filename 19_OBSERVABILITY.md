# 19 — Observability and Incident Response

> 本文定义 AI Kitchen 的日志、指标、追踪、告警、诊断、隐私脱敏和事故处理。可观测性用于回答“发生了什么、影响谁、为什么、如何恢复”，不是把所有用户内容上传到第三方。

| 属性 | 内容 |
|---|---|
| 文档状态 | Draft / Vendor-Agnostic |
| 实施状态 | 尚未选择监控供应商或建立告警 |
| 最后更新 | 2026-07-27 |

---

## 1. 目标

- requestId 贯穿 App、API、数据库、AI、规则、营养和反馈；
- 区分产品、可靠性、性能、安全和成本指标；
- 用户可以提供 requestId 定位问题；
- 故障在用户大量投诉前被发现；
- 日志默认结构化和脱敏；
- development/staging/production 分离；
- 告警可执行，有 runbook 和 owner；
- 支持发布对比、灰度和回滚。

---

## 2. 三大支柱

### Logs

离散事件和上下文，使用结构化字段，不拼接敏感全文。

### Metrics

聚合趋势和 SLO：成功率、延迟、错误、成本、BLOCK、崩溃。

### Traces

单次请求跨组件耗时和因果。requestId 作为产品追踪键，可与 trace ID 关联但不混用。

---

## 3. Correlation IDs

- `requestId`：一次 API/生成业务请求；
- `idempotencyKey`：一次用户生成意图；
- `traceId/spanId`：技术追踪；
- `recipeId`：Final Recipe；
- `release/build`；
- `subjectHash`：受控匿名化身份；
- `rule/prompt/schema/model versions`。

不得将 Access Token 或邮箱当 correlation ID。

---

## 4. 结构化日志

```json
{
  "timestamp": "...",
  "level": "info",
  "event": "recipe_generation_completed",
  "requestId": "...",
  "environment": "production",
  "release": "1.0.0+42",
  "durationMs": 12345,
  "provider": "...",
  "model": "...",
  "promptVersion": "...",
  "schemaVersion": "...",
  "ruleSetVersion": "...",
  "resultCode": "COMPLETED"
}
```

日志 event 和字段有 registry。禁止自由文本日志成为唯一证据。

---

## 5. Redaction

集中 logger 自动删除：

- Authorization/Cookie；
- API keys；
- 邮箱；
- 完整 user input；
- 过敏自由文本；
- Recipe/AI 原文；
- SQL 参数；
- SecureStore 内容。

redaction 本身需要单元测试和生产采样审查。异常对象序列化前先安全转换，不能直接 `console.error(error)`。

---

## 6. 移动端监控

- crash/ANR；
- JS unhandled errors；
- native errors；
- cold/warm start；
- screen load；
- network failure；
- local DB migration；
- sync；
- generation state recovery；
- release/update channel；
- device/OS（非精确标识）。

Breadcrumbs 使用页面名、action code、requestId，不记录输入框内容。

---

## 7. 服务端监控

- request rate/status；
- auth failure；
- rate limit；
- DB connection/query；
- generation lifecycle；
- provider latency/error；
- parse/schema/repair；
- Rule Engine；
- Food Safety BLOCK/availability；
- Nutrition availability；
- idempotency replay；
- cost/token；
- queue/cron/retention jobs。

---

## 8. 产品指标

- 首次生成转化；
- 生成完成率；
- 详情→烹饪；
- 完成烹饪；
- 收藏；
- 次日/七日回访；
- 反馈率；
- 失败后恢复率。

产品分析事件必须数据最小化，不上传食材和过敏全文。

---

## 9. AI/规则指标

- Candidate parse success；
- Final Recipe success；
- repair/retry；
- constraint violation；
- BLOCK/WARN；
- rule unavailable；
- unknown ingredient；
- Prompt/model cohort；
- Token/单次成本；
- P50/P95；
- unsafe feedback。

任何 BLOCK 率突然降为接近零可能是规则未运行，不一定是质量提升。

---

## 10. SLO 建议

实施后根据基线确认，初步定义：

- API availability；
- generation explicit outcome within 45s；
- Final Recipe success；
- safety rule availability；
- crash-free users；
- sync success；
- account deletion completion。

安全失败关闭是正确行为，不应简单算作系统可用成功；需要分别度量安全可用性和生成成功率。

---

## 11. 告警

告警必须有：阈值、窗口、严重度、owner、runbook、去重和恢复通知。

P0/P1 告警：

- production API 大面积 5xx；
- safety rules unavailable；
- known safety canary 放行；
- provider error/latency；
- cost spike；
- crash spike；
- DB/RLS异常；
- account deletion failure；
- release regression。

不对单个普通用户错误半夜告警，除非安全/越权。

---

## 12. Dashboard

### Executive/Product

活跃、生成、完成、成本、留存。

### Reliability

availability、latency、errors、crash、sync。

### AI Quality

parse、schema、repair、rule、model/prompt。

### Safety

rule availability、BLOCK/WARN、unknown、feedback、revocation。

### Release

按 app build、runtime、API deploy、model/prompt/rule version 对比。

---

## 13. 事故等级

- SEV0：数据越权、Key 泄漏、已知高风险安全放行；
- SEV1：主要生成/登录/删除不可用，大面积崩溃；
- SEV2：部分功能/地区/设备显著受影响；
- SEV3：低影响异常。

SEV0/1 需要立即停止相关发布或生成能力、保护数据、建立时间线和明确沟通。

---

## 14. Runbook 模板

```text
症状：
用户影响：
确认指标：
首要安全动作：
诊断步骤：
常见原因：
缓解：
回滚：
验证恢复：
升级联系人：
事后动作：
```

Runbook 不包含明文 Secret。常见场景：AI provider outage、Rule Engine unavailable、DB migration failure、OTA crash、cost spike、RLS incident。

---

## 15. 发布监控

- 发布前标记 baseline；
- 发布事件带版本；
- 小范围 rollout；
- 对比 crash、generation、safety、cost；
- 明确自动/人工停止条件；
- 回滚后验证指标恢复；
- 不能只看商店安装成功。

---

## 16. 数据保留

监控供应商配置 30–90 天建议，按用途和地区确认。高基数和敏感字段禁止作为 tag。原始事件导出受控。删除用户账户时，不应要求从聚合无身份指标中删除，但可识别日志按政策处理。

---

## 17. 测试

- logger redaction；
- requestId 传播；
- trace 跨组件；
- alert synthetic trigger；
- runbook 演练；
- release dashboard；
- offline/crash event；
- provider timeout；
- rule unavailable；
- cost budget；
- monitoring SDK disabled/blocked 时 App 仍可用。

---

## 18. Definition of Done

- [ ] 供应商和数据区域审查；
- [ ] 结构化日志和 event registry；
- [ ] Redaction 自动测试；
- [ ] requestId 全链路；
- [ ] 核心 dashboard；
- [ ] 安全、可靠性和成本告警；
- [ ] Runbook 和 owner；
- [ ] staging 事故演练；
- [ ] 发布灰度可观测；
- [ ] 保留与隐私政策一致。

---

## 19. 当前结论

可观测性必须与业务状态、版本和安全域绑定。记录更多原始内容并不等于更可观测；AI Kitchen 采用结构化 code、版本、耗时和 requestId 定位问题，同时对用户食材、过敏和 Recipe 内容默认最小化。
