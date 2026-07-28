# ADR-0003：正式后端迁移至内网 Node.js + MySQL

**状态：Accepted**
**日期：2026-07-28**

## 背景

用户已有内网服务器和 MySQL，正式运行不再使用 Supabase Edge Functions 或 PostgreSQL。仍必须保留 App 不直连模型/数据库、共享 Schema、幂等、失败关闭和环境隔离边界。

## 决策

正式后端为 monorepo 的 `apps/api`：Node.js、TypeScript、Fastify、Zod、`mysql2/promise` 和原生 SQL migration。Mobile 仅访问 `/api/v1`。菜谱模型固定通过阿里云百炼 OpenAI 兼容接口调用 `qwen3.7-plus`，默认参数为 temperature `0.2`、top_p `0.8`、非流式 JSON object、关闭 thinking。

MySQL 保存已校验的 recipe snapshot、幂等请求和 guest 历史；当前 guestId 只是过渡期业务标识，不是认证凭据。真实 Provider Key 和 MySQL 凭据仅存在 API 环境变量。

## 后果

- D-004 与 D-005 被本 ADR 取代；Supabase Edge runtime 和 PostgreSQL migration 已移除，不存在两个并行正式后端。
- 不实现完整登录或权限系统；后续身份方案必须基于内网 API 的可信 session/token 重新设计，不能继续假设 Supabase Auth/RLS。
- `apps/api` 可部署到内网服务器，数据库迁移、备份、日志轮转和反向代理由该运行路径负责。
- 真实 MySQL 与阿里云调用仍待填写环境变量后联调，不能据此宣称生产可用。
