# 17 — Local Storage and Sync

> 本文定义 AI Kitchen 本地数据库、安全存储、缓存、离线行为、身份命名空间、云同步、冲突处理和数据迁移。目标是在网络不稳定、App 被回收或用户升级账号时仍保持数据一致和可恢复。

| 属性 | 内容 |
|---|---|
| 文档状态 | Draft / Ready for Implementation Planning |
| 推荐方向 | SecureStore + SQLite/本地数据库 + 显式同步队列 |
| 实施状态 | 尚未创建本地 Schema 或同步服务 |
| 依赖 | `05_AUTH_AND_IDENTITY.md`、`16_STATE_MANAGEMENT.md`、`12_PRIVACY_DATA_MAP.md` |
| 最后更新 | 2026-07-27 |

---

## 1. 目标

- Token 与普通数据分离；
- guest/anonymous/registered 数据隔离；
- 离线可查看缓存 Recipe；
- 生成条件和烹饪进度可恢复；
- 收藏/删除等安全操作可排队同步；
- AI 生成不在后台自动触发费用；
- guest 升级幂等且可回滚；
- 本地 Schema 有迁移和故障恢复；
- 服务端撤回和权限变化能够覆盖陈旧缓存；
- 删除账户后本地和云端数据都清理。

---

## 2. 存储分类

| 存储 | 数据 | 原则 |
|---|---|---|
| SecureStore | Session/Refresh Token、设备级秘密 | 小、敏感、不可查询 |
| SQLite/Local DB | Recipe、草稿、烹饪 session、同步队列 | 结构化、事务、版本化 |
| Memory | 临时 UI、正在输入 | App 生命周期 |
| Query Cache | 可重新获取的服务端状态 | 不作为长期权威 |
| File Cache | 后续图片/导出 | 有配额、可清理 |

AsyncStorage 可用于少量非敏感偏好，但不作为复杂 Recipe 数据库和 Token 存储。

---

## 3. 本地 Schema

推荐表：

```text
local_meta
local_recipes
generation_drafts
cooking_sessions
cooking_timers
pending_mutations
sync_cursors
migration_jobs
local_user_preferences
```

所有用户相关表包含 `namespace`。主键可使用 `namespace + entityId`，避免切换用户后覆盖。

### 3.1 local_recipes

保存：

- recipeId/localId；
- owner namespace；
- schemaVersion；
- Snapshot JSON；
- serverUpdatedAt；
- localUpdatedAt；
- syncStatus；
- safetyStatus 和 assessment version；
- deletedAt/tombstone；
- checksum。

Snapshot 写入前必须通过共享 Schema。未知新版本不应强行解析为旧版本。

---

## 4. Namespace

```text
{environment}:{subjectType}:{subjectId}
```

示例：`production:anonymous:uuid`。要求：

- environment 不共享；
- guest ID 安装时生成；
- Auth subject 由验证会话得到；
- 登出暂停队列并切换 namespace；
- 不在新账号中自动显示旧账号数据；
- guest 合并需用户确认；
- 删除账号后移除对应 namespace。

---

## 5. 本地权威与服务端权威

### 本地权威

- 未提交草稿；
- 当前烹饪 session；
- 本地 guest Recipe；
- 待同步 mutation；
- UI 偏好。

### 服务端权威

- 云端所有权；
- Final Recipe 和版本；
- safety status/revocation；
- favorites 最终状态；
- 账户状态；
- generation request/cost。

冲突时不能简单“最后写入覆盖所有字段”，需要按实体策略处理。

---

## 6. 离线能力

允许：

- 查看已缓存 Recipe；
- 使用已缓存安全状态进入烹饪，但需要显示最后同步时间；
- 保存草稿；
- 继续烹饪 session；
- 排队收藏/删除/反馈（反馈含文本时注意敏感存储）；
- 修改本地 UI 偏好。

不允许：

- 离线生成 AI Recipe；
- 离线声明服务端已收藏/删除成功；
- 使用未知或 revoked 状态继续展示；
- 离线升级账号；
- 自动在联网后执行用户未明确确认的付费生成。

---

## 7. Sync Engine

```text
Trigger (app start/foreground/network/user refresh)
→ Resolve session & namespace
→ Flush eligible local mutations
→ Pull remote changes with cursor
→ Validate/migrate payload
→ Apply transaction
→ Resolve conflicts
→ Update cursor
→ Emit sync report
```

同步必须串行处理同一 namespace，避免多个 worker 同时覆盖 cursor。可以按实体并行，但需要明确依赖。

---

## 8. Pending Mutation

每个队列项包含：

- mutationId；
- namespace；
- entity type/id；
- operation；
- payloadVersion；
- idempotencyKey；
- createdAt；
- attempts；
- nextAttemptAt；
- lastErrorCode；
- status。

重试使用指数退避和上限。401 暂停等待会话；403 永久失败并回滚；409 进入冲突；429 遵循 retry-after。

---

## 9. 实体冲突策略

### Favorites

集合语义。add/remove 使用独立 idempotent operation，服务端最终状态权威。

### Recipe Delete

使用 tombstone。删除优先于旧缓存更新；服务端确认后保留短期 tombstone 防止复活。

### Preferences

字段级或 server timestamp，冲突时提示用户仅针对高影响字段，如过敏约束。不能静默覆盖不同设备上的安全偏好。

### Cooking Session

默认设备本地，不做多设备实时同步。未来同步需明确单 active session。

### Recipe Snapshot

服务端 Final Recipe 不做客户端字段级合并。用户修改创建派生版本或本地 annotation，不改原 Snapshot。

---

## 10. Guest 升级迁移

状态机：

```text
not_started → snapshot_created → auth_ready → uploading
→ verifying → completed | failed | rolled_back
```

要求：

- migrationId 唯一；
- 上传操作幂等；
- 迁移前记录数量/checksum；
- 服务端返回映射 localId→serverId；
- 校验后才切 namespace；
- 失败保留 guest 数据；
- 重启后可恢复；
- 登录已有账号时先展示合并选择；
- 过敏和偏好冲突必须明确。

---

## 11. Schema 迁移

本地迁移：

- 每个版本单向、事务化；
- 大迁移分批并可恢复；
- 迁移前检查可用空间；
- 失败不静默清库；
- 保存错误 code 和诊断；
- production 禁止 destructive fallback；
- 支持旧 Recipe Snapshot 的 reader/migrator；
- 测试从多个历史版本升级。

删除字段使用 expand-contract：先支持新旧读，再写新格式，最后移除旧字段。

---

## 12. 数据完整性

- 外键或应用级引用检查；
- checksum 检测损坏；
- transaction 写 Recipe + index；
- pending mutation 与实体状态同事务；
- timer checkpoint 原子；
- sync cursor 仅在全部 apply 成功后推进；
- clock skew 不作为唯一排序依据；
- server version/etag 用于并发控制。

---

## 13. 配额与清理

- Recipe 缓存 LRU/数量上限，但收藏和 active cooking 不自动清理；
- 图片缓存单独配额；
- 完成的 mutation 定时清理；
- 失败诊断保留有限周期；
- guest 数据在用户卸载前存在，提供清除按钮；
- 系统低空间时优先删可重新下载资源；
- 不删除未同步草稿或 active session。

---

## 14. 安全与隐私

- Token 只在 SecureStore；
- SQLite 默认不等同于加密保险箱；
- 避免保存完整高敏感自由文本；
- 退出/删除清理 namespace 和 Query cache；
- 调试导出需用户明确操作并脱敏；
- 备份行为需评估系统云备份；
- 截图、日志和崩溃报告不包含数据库全文；
- 设备被 root 不改变服务端授权边界。

---

## 15. Safety Revocation

服务端 Recipe 可变更为 `safety_revoked`。客户端：

- 同步时更新 assessment；
- 打开详情前刷新（在线）；
- offline 缓存显示最后状态与同步时间；
- 已知 revoked 时禁止进入步骤；
- 不删除 Snapshot，保留解释和反馈；
- active cooking 收到撤回时显示阻断界面；
- 同步失败时不把 unknown 当 safe。

---

## 16. 测试

- 首次建库；
- 每个历史 Schema 升级；
- 迁移中断和恢复；
- 磁盘满；
- 损坏 row；
- guest→anonymous 成功/失败/重试；
- 账号切换；
- 离线收藏/删除；
- 409 冲突；
- cursor 不重复/不漏；
- Recipe revocation；
- App 被回收后的 timer；
- 删除账户后无残留；
- development/staging/prod 隔离。

---

## 17. 可观测性

记录聚合指标：

- sync success/failure；
- queue length/age；
- migration duration/failure；
- conflict count；
- stale safety cache；
- local DB open errors；
- guest migration success；
- cache hit；
- cleanup bytes。

不上传数据库内容本身。

---

## 18. Definition of Done

- [ ] SecureStore 与 Local DB 边界明确；
- [ ] 所有用户数据有 namespace；
- [ ] 本地 Schema 与迁移测试通过；
- [ ] 离线能力和禁区符合文档；
- [ ] mutation 队列幂等；
- [ ] guest 升级可恢复且不丢数据；
- [ ] 账号切换无串数据；
- [ ] safety revocation 覆盖缓存；
- [ ] 账户删除清理本地；
- [ ] 弱网、回收、磁盘异常通过。

---

## 19. 当前结论

本地存储不是“把 API 结果缓存一下”，而是身份隔离、离线体验、烹饪恢复和迁移可靠性的基础。Sync Engine 必须显式处理幂等、cursor、冲突、tombstone 和失败恢复；AI 生成则保持用户主动在线触发，避免隐藏成本。
