# 20 — Deployment and Release

> 本文定义 AI Kitchen 从开发环境到应用商店的构建、数据库迁移、Edge Function、配置、灰度、回滚和发布证据。任何环境变化必须可重复，任何生产发布必须可停止和恢复。

| 属性 | 内容 |
|---|---|
| 文档状态 | Draft / Ready for CI/CD Design |
| 实施状态 | Supabase migration/Function 部署脚本已创建；远程环境、EAS 与商店签名尚未完成 |
| 依赖 | `14_EXPO_AND_NATIVE_STRATEGY.md`、`18_TEST_STRATEGY.md`、`19_OBSERVABILITY.md` |
| 最后更新 | 2026-07-27 |

---

## 1. 发布对象

AI Kitchen 不是单一 App 包，发布包含：

- Mobile binary；
- OTA JS update；
- API/Edge Functions；
- Database migrations；
- Shared Schema；
- Prompt version；
- Rule sets；
- Nutrition data version；
- 配置和 feature flags；
- 隐私/支持页面。

Release Manifest 必须记录这些版本组合。

---

## 2. 环境

### Development

个人开发、合成数据、低预算、可调试。

### Staging

接近生产配置、独立 Auth/DB/AI key、内测和迁移演练。

### Production

正式数据、最小权限、受控发布、告警和审计。

禁止 staging App 访问 production API，禁止生产数据复制到 development。

---

## 3. 分支与版本

推荐 trunk-based + short-lived branch：

- PR 合并 main；
- main 自动部署 development/生成 preview；
- release tag 触发生产候选；
- hotfix 从稳定 tag 创建；
- 文档和 migration 与代码同 commit；
- 版本号、build number 自动化。

大型变更用 feature flag，不长期维护多个漂移分支。

---

## 4. CI Pipeline

### PR

- install with lockfile；
- typecheck/lint/test；
- contract/schema diff；
- SQL validate；
- security/license/secret scan；
- mobile config validation；
- docs validation。

### Main

- build shared packages；
- deploy development function；
- development migration；
- integration/RLS；
- preview artifact；
- changelog evidence。

### Release Candidate

- staging migration；
- staging functions；
- prompt/rules staged；
- EAS preview/production candidate；
- full tests；
- device matrix；
- approval。

---

## 5. Release Manifest

```json
{
  "appVersion":"1.0.0",
  "build":"42",
  "runtimeVersion":"1.0.0",
  "gitCommit":"...",
  "apiVersion":"v1",
  "databaseMigration":"2026...",
  "recipeSchema":"recipe.v1.0.0",
  "promptVersion":"recipe.v1.0.0",
  "businessRules":"business.v1.0.0",
  "foodSafetyRules":"food-safety.region.v1.0.0",
  "nutritionVersion":"nutrition.v1.0.0"
}
```

Manifest 可在诊断页和日志中引用，不暴露 Secrets。

---

## 6. 数据库迁移

原则：

- migration append-only；
- staging 先执行；
- 生产前备份/恢复点；
- expand-contract；
- 大表分批；
- 锁和耗时评估；
- RLS 与索引同批审查；
- destructive change 需要 ADR；
- 失败优先 forward fix，回滚策略预先定义；
- App/API 向后兼容至少覆盖发布窗口。

不允许手工在 production Dashboard 改表后再补 migration。

---

## 7. Edge Function/API 发布

- immutable build artifact；
- 环境 Secrets；
- smoke test；
- API compatibility；
- rate limit/budget；
- canary 或小流量；
- requestId；
- 回滚上一版本；
- provider total switch。

服务端先兼容新旧客户端，再发布 App；删除旧字段要等待最低版本策略。

---

## 8. Prompt/Rule 发布

Prompt：staging eval→灰度→监控→active。

Food Safety：shadow 可以比较，但用户保护始终使用已批准 active 规则；规则不可用失败关闭。

每次发布记录 checksum、source、审批、测试和 rollback version。禁止生产控制台无记录热改。

---

## 9. Mobile Build

- clean dependency install；
- production config；
- unique build number；
- signing controlled；
- no debug menu；
- no production Secrets in JS；
- source maps securely uploaded；
- privacy manifest/permissions；
- artifact checksum；
- install smoke；
- release notes。

Android 优先完成 internal/closed testing，再准备 iOS。

---

## 10. OTA Update

适合：JS UI bug、文案、非原生逻辑修复。

不适合：原生权限、SDK、数据库不兼容、重大政策或需要商店审核的功能。

发布步骤：staging channel→内部→小 rollout→指标→扩大。事故停止 rollout 并回退上一 update。

---

## 11. Feature Flags

用途：

- 非安全新功能；
- Provider 灰度；
- UI 实验；
- 总开关；
- 地区能力。

规则：默认安全值、服务端权威、版本和 owner、过期日期、测试 on/off。不能用 flag 绕过安全规则或 RLS。

---

## 12. 发布顺序

推荐：

1. 数据库兼容迁移；
2. 服务端支持新旧客户端；
3. Prompt/Rule/Nutrition staged；
4. staging end-to-end；
5. production server canary；
6. mobile internal/closed；
7. store staged rollout；
8. 监控；
9. 清理旧路径（后续版本）。

---

## 13. 回滚矩阵

| 对象 | 回滚 |
|---|---|
| API | 部署上一 immutable version |
| DB | forward fix/兼容视图；必要时恢复点 |
| Prompt | 切 previous approved version |
| Rules | previous approved；安全评估 |
| OTA | rollback channel update |
| Mobile binary | 停止 rollout/提交修复，服务端兼容 |
| Feature flag | 关闭 |
| AI Provider | adapter switch/total switch |

数据库回滚最危险，因此优先兼容和 forward fix。

---

## 14. 发布审批

至少确认：

- 产品范围；
- 测试结果；
- safety/RLS/security；
- migration；
- observability；
- privacy/store；
- budget；
- rollback；
- support readiness。

非专业开发者可以发起，但生产批准不能仅由生成代码的同一个 AI 自我确认。

---

## 15. Secrets 和签名

- CI/EAS/Supabase Secret store；
- 最小访问；
- 定期轮换；
- 泄漏立即撤销；
- 不在日志/artifact；
- Android keystore、Apple certificates 和 recovery 受控备份；
- 离职/账号变化撤权；
- production 权限审计。

---

## 16. Release Notes 与 Changelog

- 用户可见变化；
- 修复和已知问题；
- 隐私/权限变化；
- 数据迁移；
- Prompt/Rule/Schema 版本；
- 回滚说明；
- 支持入口。

CHANGELOG 不写计划冒充完成。

---

## 17. 生产验证

发布后验证：

- 安装/升级；
- 登录/guest；
- 生成成功/失败；
- safety canary；
- 历史/收藏；
- timer；
- feedback；
- account deletion（受控测试账户）；
- crash/error/cost；
- store listing links。

不使用真实用户账户做危险测试。

---

## 18. Hotfix

- 先止血：flag/rollback/disable provider；
- 建立 incident；
- 最小变更；
- 关键回归；
- 发布和验证；
- 后补完整复盘，不跳过记录；
- 不把 hotfix 直接手改生产而不回 Git。

安全漏洞和过敏放行优先关闭相关能力。

---

## 19. Definition of Done

- [ ] 三环境完全隔离；
- [ ] CI 分层和不可变 artifact；
- [ ] Release Manifest；
- [ ] migration staging 演练；
- [ ] API 新旧兼容；
- [ ] Prompt/Rule 可版本回滚；
- [ ] EAS signing/Secrets 受控；
- [ ] OTA rollout/rollback；
- [ ] 生产 dashboard/alert；
- [ ] 发布审批和证据；
- [ ] 商店分阶段发布；
- [ ] 热修和事故流程演练。

---

## 20. 当前结论

AI Kitchen 的发布单位是一个版本组合，而不只是 APK/IPA。数据库、API、App、Prompt、Rule 和 Schema 必须兼容并可追踪。发布采取 staging 验证、小范围 rollout、指标观察和明确回滚，不允许“直接上线再看”。
