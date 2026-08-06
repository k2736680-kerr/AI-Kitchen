# Project State — 项目稳定状态

> 本文件记录相对稳定的项目事实。日常任务、当前错误和下一步以 `CURRENT_STATUS.md` 为准。

| 属性 | 当前值 |
|---|---|
| 状态日期 | 2026-08-06 |
| Blueprint 版本 | 1.0.0 |
| Blueprint 状态 | Phase 1–4 完成 |
| 产品阶段 | P0 移动端主链路与 Supabase 正式后端已联通，等待 ARM64 真机安装验收 |
| 代码状态 | pnpm Monorepo、Mobile、Shared/Server Core、Supabase migration/RLS/Edge Function 已实现并部署；旧 Fastify/MySQL 服务器、数据库和账号已全部清理 |
| 发布状态 | 未发布 |
| 优先平台 | Android |

---

## 1. 项目使命

帮助用户基于已有食材，在较短时间内获得真正可执行的结构化菜谱，并通过程序化规则降低过敏、非食用物、错误厨具和不可执行步骤带来的风险。

---

## 2. 已完成的稳定成果

- 产品愿景、用户、核心流程、非目标和 P0/P1/P2 范围；
- 12–18 周总体路线；
- React Native/Expo/Supabase Auth/PostgreSQL/RLS/Edge Functions 技术基线；
- 数据库、API、身份、Recipe Schema 和 AI Pipeline；
- Prompt、Rule、Food Safety、Nutrition 和 Privacy 设计；
- Mobile、Expo、UI、State、Local Sync、Testing、Observability、Deployment 和 Store 设计；
- Cursor、Claude Code、Codex、ChatGPT 规则和 Handoff；
- 文档索引、ADR、Changelog 和状态机制。

这些是设计和治理成果，不是可运行产品成果。

---

## 3. 已锁定的核心决策

- React Native + Expo + TypeScript；
- Android 优先；
- App 只调用自有后端；
- Supabase Edge Function + PostgreSQL/RLS；
- 生产 API 使用 Supabase 托管 HTTPS；
- Monorepo + 共享 Schema；
- Recipe Candidate 与 Final Recipe 分离；
- AI 输出四层处理；
- Food Safety 失败关闭；
- 标准食材 ID 和别名分离；
- guest → anonymous → registered；
- requestId + idempotencyKey；
- 规范化关系数据 + Recipe Snapshot；
- 三环境隔离；
- 薄路由/Feature/Use Case/Domain/Repository 客户端结构；
- Server State、Local DB 和 UI State 分离；
- SecureStore + Local DB + 显式 Sync；
- Expo Development Build + EAS；
- 结构化、脱敏、版本化可观测性；
- App/API/DB/Prompt/Rule/Schema 版本组合发布；
- AI 工具规则是上下文约束，真实安全仍由权限、测试和门禁强制。

完整背景见 `DECISIONS.md`。

---

## 4. 当前技术目标

### Mobile

React Native、Expo、TypeScript strict、Expo Router、Query layer、轻量 Store、Local DB、SecureStore、EAS。

### Backend/Data

Supabase Edge Function、PostgreSQL migrations、RLS、事务 RPC、versioned REST、rate limit、budget、logs。

### AI/Domain

Provider Adapter、Prompt Registry、Candidate Schema、Rule Engine、Food Safety、Nutrition、fixed evaluation set。

### Delivery

CI gates、real-device matrix、observability、staged release、rollback、store/privacy readiness。

---

## 5. 当前产品范围

P0：固定数据移动主流程 + 一道真实 AI Recipe + 本地历史 + Android 真机。

P1：匿名身份、云历史/收藏、完整约束、烹饪模式、安全基础、反馈和内测。

P2：正式账号、删除、营养来源、隐私、监控、签名、iOS 和商店发布。

后续功能池不得未经变更流程进入 P0/P1。

---

## 6. 尚未开始或尚未接通

- 公网网关可信 HTTPS/443 与 Android ARM 真机外网验收；
- 可信身份/登录、跨启动同步和本地 DB；
- automated E2E/CI；
- EAS/monitoring/store release。

---

## 7. 开放决策

- AI Provider；
- 标准食材数据和许可；
- 首发地区及 Food Safety 审核；
- Nutrition 数据和许可；
- Monitoring vendor；
- E2E 工具；
- 品牌/包标识；
- 免费额度/预算；
- 首发国家、政策语言和支持方式。

这些应在对应实施阶段通过 ADR 确认，不应提前写死在多个模块。

---

## 8. 主要风险和控制

| 风险 | 控制 |
|---|---|
| AI 不稳定 | Candidate/Final 分离、Schema、repair、rules、evaluation |
| 过敏/危险放行 | deterministic safety、失败关闭、零放行门禁 |
| 数据越权 | server subject、RLS、A/B 测试 |
| 重复计费 | idempotency、request recovery、unique constraints |
| 本地串数据 | namespace、account switch tests |
| 数据丢失 | migrations、snapshot、sync/tombstone、backup |
| 成本失控 | limits、Token、budget、kill switch |
| 范围膨胀 | P0/P1/P2、ADR |
| AI 上下文漂移 | 编号 Blueprint、根 `AGENTS.md`、状态与决策文档 |
| 发布/隐私不一致 | data map、store checklist、release manifest |

---

## 9. 下一阶段退出条件

当前 ARM64 真机验收阶段只有在以下完成后退出：

- Supabase Release APK 安装到真实 Android ARM64 手机；
- anonymous session 创建与刷新成功；
- 真实生成、详情、历史和 visit 主链路成功；
- 记录启动、网络、生成时延和崩溃日志；
- 确认 App 不包含旧域名、旧服务器地址或服务端 Secret；
- 状态文档和可回滚提交真实更新。
