# MySQL Schema — 身份阶段 1

本文件补充 `apps/api/migrations/003_identity_session_foundation.up.sql` 的运行说明。Migration 只新增游客身份与会话表，不删除或重建现有业务表，不包含密码、Token、Key、连接地址或真实用户数据。

## `ai_kitchen_guest_identities`

- `guest_id CHAR(36)`：服务端生成 UUID 主键。
- `status ENUM('active', 'revoked')`：身份状态。
- `created_at`、`updated_at`、`last_seen_at`、`revoked_at`：UTC `DATETIME(3)`。
- `idx_ai_kitchen_guest_status`：状态索引。

## `ai_kitchen_sessions`

- `session_id CHAR(36)`：服务端生成 UUID 主键。
- `guest_id CHAR(36)`：外键关联 `ai_kitchen_guest_identities(guest_id)`，身份删除时级联删除 session。
- `token_hash CHAR(64)`：SHA-256 十六进制哈希，唯一；不保存原始 token。
- `expires_at`、`created_at`、`last_seen_at`、`revoked_at`：UTC `DATETIME(3)`。
- `uq_ai_kitchen_session_token_hash`：token hash 唯一约束。
- `idx_ai_kitchen_session_guest`：guest 查询索引。
- `idx_ai_kitchen_session_expiry`：过期清理/查询索引。
- `idx_ai_kitchen_session_active_expiry`：撤销状态和过期时间索引。
- `fk_ai_kitchen_session_guest`：guest 外键。

现有四张表和历史 raw guestId 数据保持不变。应用层确保新 generation request 和 history 使用已验证 session 的 guestId；动态 recipe detail 通过当前 guest 的 history 所有权校验。recipe owner 独立列和正式账号 owner migration 留给后续注册阶段。

## 回滚

只允许在确认不需要保留身份数据的环境执行：

```text
pnpm --filter @ai-kitchen/api migrate:down 003_identity_session_foundation
```

生产/真实联调环境本阶段不执行 down，不手动删除表，不使用 root。
