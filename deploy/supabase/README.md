# Supabase 部署

正式后端使用 Supabase anonymous Auth、PostgreSQL/RLS 和单个 `api` Edge Function，Mobile REST 契约保持 `/api/v1`。

## 配置

首次部署时从 `.env.example` 复制 `.env`，填写：

- `SUPABASE_ACCESS_TOKEN`：Supabase Personal Access Token；
- `SUPABASE_DB_PASSWORD`：项目数据库密码；
- `DASHSCOPE_API_KEY`：仅首次创建或轮换百炼密钥时填写，留空会保留远程现有 Secret。

当前项目 Ref 为 `dthfeeafcecfmxghjnbo`，区域为首尔 `ap-northeast-2`。重复部署时应填写现有 Project Ref，不创建第二个项目。

## 执行

在仓库根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File deploy/supabase/deploy.ps1
```

脚本会构建共享核心、应用 migration、执行数据库检查、按需更新百炼 Secret、部署 Function，并验证 Guest → Session → Generate → Recipe → History → Visit 和跨游客隔离。旧服务器已删除，不再作为回滚路径。
