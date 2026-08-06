# Current Status — 当前状态

> 更新日期：2026-08-06。本文只保留当前事实；历史过程统一记录在 `CHANGELOG.md` 和 `DECISIONS.md`。

## 正式运行链路

- 正式后端：Supabase anonymous Auth、PostgreSQL/RLS、单个 `api` Edge Function。
- 项目 Ref：`dthfeeafcecfmxghjnbo`，区域：首尔 `ap-northeast-2`。
- 生产 API：`https://dthfeeafcecfmxghjnbo.supabase.co/functions/v1/api`。
- AI：阿里云百炼 DashScope；Key 只保存在 Supabase Function Secret。
- Mobile production 已切换到 Supabase HTTPS，不使用自定义测试域名、内网穿透或旧服务器。

已验证的真实链路：

- Health 显示数据库连接和 Provider 配置正常；
- Guest Session、Session Refresh、Generate、Recipe、History、Visit 全部成功；
- 跨游客读取返回 404；
- 有效用户 JWT 直接访问业务表返回 403，客户端不能绕过 Edge Function/RPC；
- PostgreSQL migration、RLS、固定 search path 和数据库 SSL enforcement 已部署。

## Mobile 与交付产物

- Expo SDK 57、React Native、TypeScript，Android 优先。
- production Base URL 已固定为 Supabase HTTPS。
- ARM64 APK：`artifacts/android/ai-kitchen-1.0.0-arm64-supabase.apk`。
- SHA-256：`E5DC01E35CC6F740912CF23A0812EAA17187883A402A1759B936A4B49D505AD9`。
- 首页、探索、历史、多方案生成、统一选择控件、主题和启动/引导视觉已完成一轮响应与一致性优化。
- x86_64 模拟器 Release 曾完成无 Metro 冷启动和主要页面检查；最终 ARM64 APK 尚未在用户真机安装验收。

## 旧服务器清理

`10.0.30.171` 上的 AI Kitchen 已永久停用并完成以下清理：

- Compose API/TLS 容器、4 个专用 API 镜像、专用网络；
- `/home/kerr/ai-kitchen`、服务端 Secret、证书、acme.sh 和续期 cron；
- AI Kitchen BuildKit 专用缓存；
- MySQL `ai_kitchen` 数据库和 6 张表；
- 2 条 `ai_kitchen_api` Host 账号记录；
- 3100、3101、443 端口监听。

同机 `alcor-device-farm-stf` 与 `vega-face-search` 容器保持运行。外部内网穿透管理后台中指向 `10.0.30.171:3100` 的规则仍需用户自行删除，因为该配置不在服务器文件系统内。

## 本地仓库清理

- 删除旧服务器 `deploy/server`、Docker/TLS 配置和本地旧服务器 `.env`；
- 删除 Fastify 兼容实现中仅服务于旧域名的 ACME challenge、TLS 代理共享密钥和公网 HTTP 拦截逻辑；活动代码已无 `10.0.30.171` / `kerr.test.moyoung.com` 运行配置引用；
- 删除旧 x86_64 APK，只保留 ARM64 Supabase APK；
- 删除约 2.26 GB Android 构建中间产物、旧 APK、Expo 缓存、API dist 和 Supabase CLI 临时文件；
- 删除重复素材压缩包、导入目录、原始 Blueprint DOCX、素材 manifest 和未引用图片；
- 删除未引用 Expo 模板组件/素材和旧 ingredient `gen2` 素材；
- Markdown 从 51 份缩减到 32 份；删除过期 MySQL/身份/竞品/素材审核文档、重复 ADR，以及 Cursor/Claude/ChatGPT 专用旧指令；
- 保留 22 份编号 Blueprint，因为它们仍是 Schema、食品安全、隐私、测试和发布边界的正式设计依据；
- 保留 `node_modules` 与 `.pnpm-store`，避免再次触发 Windows 原生依赖安装和文件锁问题。

## 当前验证与已知问题

- Supabase 远程真实接口、RLS 与越权测试已通过。
- 本轮清理后全仓 typecheck 通过；Shared 6 个测试文件 30 项、API 6 个测试文件 20 项、Mobile 配置/Session 2 个测试文件 7 项、Edge 3 项测试全部通过；API lint 和 PowerShell 部署脚本语法检查通过。
- Markdown 相对链接检查通过，已删除组件/素材引用扫描为 0。
- Mobile lint 仍会在规则执行前因 hoisted ESLint/AJV `defaultMeta` 初始化故障退出。
- 当前没有在线 ADB 真机，ARM64 APK 尚未安装实测。

## 下一项唯一任务

连接 Android ARM64 真机并安装 Supabase APK，验证匿名会话、真实生成、详情、历史、网络时延和崩溃日志。

## 回滚

- 旧服务器和 MySQL 数据已删除，无法原地回滚；如确需恢复只能从仓库重新部署并新建数据库。
- Supabase schema 可由 migration 重建，但 anonymous guest 数据不保证跨项目恢复。
- 本地源码删除均可通过 Git 恢复；忽略的缓存、旧 APK、Secret 和服务器数据不提供恢复保证。
