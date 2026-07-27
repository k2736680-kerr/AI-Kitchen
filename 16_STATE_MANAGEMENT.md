# 16 — State Management

> 本文定义 AI Kitchen 如何区分服务端状态、持久本地状态、跨页面客户端状态和组件临时状态，防止使用一个全局 Store 承载所有数据。

| 属性 | 内容 |
|---|---|
| 文档状态 | Draft / Ready for Implementation Planning |
| 推荐组合 | TanStack Query（服务端）+ 轻量 Store（跨页 UI）+ Local DB（持久数据） |
| 实施状态 | 未安装状态库 |
| 最后更新 | 2026-07-27 |

---

## 1. 状态分类

| 类别 | 例子 | 权威位置 |
|---|---|---|
| Server State | Recipe、历史、收藏、请求状态 | API/数据库 |
| Persistent Local State | 草稿、缓存、烹饪进度、同步队列 | Local DB/SecureStore |
| Cross-screen Client State | 当前生成向导、临时筛选 | 轻量 Store |
| Component State | 弹窗、输入焦点、展开状态 | React state |
| Derived State | 已选数量、是否可提交 | selector/纯函数 |

错误做法是把所有 Recipe、Token、表单、导航和计时器都塞进一个 Store 并持久化。

---

## 2. 服务端状态

使用 Query layer 管理：

- query key；
- fetch、缓存、stale；
- 刷新；
- mutation；
- optimistic update；
- offline/online；
- retry policy；
- error mapping。

Query key 必须包含环境和 subject namespace：

```ts
['recipes', environment, subjectKey, filters]
```

切换用户时取消请求、清除/切换缓存，不能复用上一用户数据。

---

## 3. Query 策略

### 3.1 重试

- GET 可对网络瞬时错误有限重试；
- 401 不盲重试，先刷新会话；
- 403 不重试；
- 429 使用 retry-after；
- generate POST 不创建新幂等 Key；
- safety blocked 不重试相同 Candidate；
- schema error 由服务端处理，客户端不循环。

### 3.2 缓存

- Recipe detail 可较长 stale，但打开时检查撤回状态；
- generation request 在进行中短轮询，完成后停止；
- preferences 更新后立即同步 cache；
- 历史分页使用 cursor；
- 缓存不是离线数据库替代；
- 敏感数据不持久化到通用 Query cache 文件。

---

## 4. 轻量 Store

可选择 Zustand 或同类，但只管理：

- 生成向导草稿引用；
- 当前食材选择的非持久工作副本；
- UI 过滤和排序；
- app-level 非服务端开关；
- 一次性迁移/引导状态。

Store action 语义化，不暴露任意 `setState` 给页面。持久化只对白名单字段，版本升级有 migration。

---

## 5. 表单状态

表单使用局部 form state + Zod：

- 输入阶段允许暂时无效；
- 提交阶段转换为共享 request schema；
- 字段错误与服务端错误合并；
- 离开页面保存草稿到 Local DB；
- reset 有明确范围；
- 过敏等敏感字段不进入调试日志；
- 表单值不作为 Final Recipe 可信字段。

---

## 6. 生成状态机

生成是显式状态机，不用多个布尔值：

```ts
type GenerationState =
  | { status:'idle' }
  | { status:'validating' }
  | { status:'submitting'; idempotencyKey:string }
  | { status:'waiting'; requestId:string; startedAt:string }
  | { status:'recovering'; requestId:string }
  | { status:'completed'; recipeId:string }
  | { status:'blocked'; requestId:string; code:string }
  | { status:'failed'; requestId?:string; error:AppError }
  | { status:'cancelled'; requestId?:string };
```

不可能状态不应可表示，例如 `loading=true` 同时 `completed=true`。

---

## 7. 烹饪状态

烹饪 session 保存在 Local DB，Store 只订阅当前 session view：

- recipeId；
- currentStep；
- completedSteps；
- timers；
- updatedAt；
- sessionVersion。

计时器剩余时间是派生值，不每秒写数据库。关键操作和 App background 时 checkpoint。

---

## 8. 乐观更新

允许：

- 收藏/取消收藏；
- 非关键偏好；
- 本地删除标记。

条件：

- 可回滚；
- mutation ID 幂等；
- 用户 namespace 不变；
- 失败明确提示；
- 不对 safety status、账户删除和生成结果做乐观伪造。

---

## 9. Offline Queue

队列项：

```ts
interface PendingMutation {
  id: string;
  namespace: string;
  type: 'favorite_add'|'favorite_remove'|'recipe_delete'|'feedback_create';
  payloadVersion: string;
  createdAt: string;
  attempts: number;
  idempotencyKey: string;
}
```

生成 AI 菜谱不离线排队自动执行，避免用户恢复网络后意外产生费用。用户需主动重试。

---

## 10. Hydration

- 启动只 hydrate 必需状态；
- Store 未 hydrate 时显示 splash/skeleton，不渲染错误用户数据；
- migration 失败进入恢复流程；
- 不把旧版本未知字段直接注入 Store；
- Query cache 与 Local DB 各自有版本；
- 登录状态先于用户数据 hydrate。

---

## 11. Derived State

所有可从源数据计算的值不重复保存：

- selectedCount；
- canGenerate；
- perServing nutrition；
- timer remaining；
- hasBlockingFinding；
- current step progress。

重复保存会导致不同步和迁移复杂度。

---

## 12. 并发与竞态

必须处理：

- 用户快速切换账号；
- 同一页面重复提交；
- 请求完成时页面已卸载；
- refresh token 与 API 并发；
- 本地 mutation 与远端刷新；
- App 后台后 timer 和 query 恢复；
- recipe 被服务端撤回但本地仍缓存；
- migration 与同步同时运行。

使用 abort、request ownership、mutation queue 和 namespace guard，不依赖“通常不会发生”。

---

## 13. 调试

开发环境可提供：

- Query Devtools 等价能力；
- 当前 namespace；
- generation state；
- sync queue 长度；
- local schema version；
- last requestId。

不得显示 Token、过敏原原文、完整生产数据。调试面板必须从 production 移除或受控。

---

## 14. 测试

- state machine transition；
- selector；
- Store migration；
- user namespace switch；
- query retry；
- optimistic rollback；
- offline queue；
- hydration failure；
- timer derived state；
- request completion after unmount；
- concurrent mutation ordering。

测试优先调用公开 action/use case，不直接修改 Store 内部。

---

## 15. Definition of Done

- [ ] 状态分类和权威来源清楚；
- [ ] Server State 不复制进全局 Store；
- [ ] Query key 包含 subject namespace；
- [ ] 生成使用显式状态机和幂等恢复；
- [ ] 烹饪 session 可持久恢复；
- [ ] Store 有版本和 migration；
- [ ] 离线队列不会自动产生 AI 费用；
- [ ] 乐观更新可回滚；
- [ ] 账号切换无串数据；
- [ ] 并发和 hydration 测试通过。

---

## 16. 当前结论

AI Kitchen 不使用“一个全局 Store 管所有东西”。服务端状态由 Query 管理，持久状态由 Local DB 管理，跨页面短期 UI 由轻量 Store 管理，组件状态留在组件。明确权威来源比选择具体库更重要。
