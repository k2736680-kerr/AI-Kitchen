# ADR-0001：身份、数据归属与隐私基础

**状态：** Accepted for planning; implementation not started  
**日期：** 2026-07-27  
**范围：** P0–P2 identity, ownership, privacy and profile foundation

## 背景

AI Kitchen 需要同时支持无需注册的首次体验、可恢复的云端匿名身份和正式账号。身份、数据归属与密钥边界必须先于 Auth、数据库和业务数据实现锁定。本 ADR 是设计决策，不代表 Supabase、Auth、数据库、迁移或 RLS 已实现。

## 决策

### 1. 身份状态与路径

目标路径为：

```text
guest → anonymous → registered
```

| 状态 | 定义与约束 |
|---|---|
| `guest` | 没有 Supabase 用户 ID；只使用本地随机 namespace；不得使用设备 ID、邮箱或手机号作为主键。首次启动默认进入 guest。P0 以 guest 和本地固定数据原型为主。 |
| `anonymous` | 拥有 `auth.users.id`；PostgreSQL role 为 `authenticated`；JWT `is_anonymous = true`；会话仍有效时可以恢复。主动退出或会话永久丢失后，不能保证重新访问同一个匿名账号；清除匿名会话前应提示或要求升级为 registered。P1 才启用该云端身份。 |
| `registered` | 拥有 `auth.users.id`；PostgreSQL role 为 `authenticated`；JWT `is_anonymous = false`；可通过已绑定身份重新登录。P2 才交付完整 registered 登录能力。 |

`guest → anonymous` 在首次需要云端持久数据时发生；`anonymous → registered` 通过身份绑定发生。当前 ADR 不代表立即实现 Auth。

### 2. Anonymous 升级原则

升级前后的 `auth.users.id` 必须保持一致，因而 `owner_id` 不应因身份升级而迁移。身份链接属于后续实施能力，必须分别验证：

- Manual Identity Linking 配置；
- 邮箱或密码升级；
- OAuth 身份链接；
- 升级前后 user ID 是否相同；
- profile 是否重复；
- `owner_id` 是否改变。

不得承诺所有 Provider 自动保持 ID；必须通过集成测试确认。

Guest 直接注册时，先创建 registered Auth 身份，再按独立、幂等、可恢复的迁移协议上传用户确认的本地数据。

### 3. 数据归属

云端用户数据统一遵循：

```text
owner_id = auth.uid()
```

anonymous 与 registered 均使用真实 `auth.users.id`。guest 默认不写入长期用户云端数据；若未来 P0 允许短期云端请求，只使用服务端签发的 guest session 和不可逆 subject hash。

禁止：

- 使用客户端 body 中的 `ownerId` 授权；
- 使用设备 ID 作为 owner；
- 使用邮箱或手机号作为业务主外键；
- 仅依赖 API 参数判断所有权。

必须具备 `owner_id` 的长期云端用户数据包括 profiles、preferences、recipes、favorites、feedback，以及后续用户持久实体。

### 4. RLS 与角色

```text
未登录 guest：无用户 JWT
anonymous Auth 用户：role = authenticated, is_anonymous = true
registered 用户：role = authenticated, is_anonymous = false
```

RLS 默认拒绝。用户所有权策略至少使用：

```sql
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid())
```

仅注册用户可用的能力还必须检查：

```text
is_anonymous = false
```

### 5. Edge Function 客户端边界

User-scoped Supabase client 使用调用者 Authorization JWT，受 RLS 限制，普通用户业务 CRUD 默认使用该客户端。

Admin Supabase client 使用 Secret Key 或旧版 Service Role Key，能够绕过 RLS，只能用于后台管理、账户删除、系统任务和明确批准的受控事务。

普通业务不得“全部使用 Service Role，然后依靠 RLS”。使用 Admin client 时必须：

1. 先验证调用者身份；
2. 显式建立授权规则；
3. 不接受客户端 `ownerId` 作为最终依据；
4. 通过用户 A/B 越权测试；
5. 记录不含敏感内容的审计事件。

### 6. API Key 边界

客户端使用 Publishable Key 或旧版 Anon Key。服务端使用 Secret Key 或旧版 Service Role Key。

服务端私密 Key 绝不能进入：

```text
EXPO_PUBLIC_*
app.json
移动端源码
Git
日志
测试 fixture
构建产物
```

### 7. `public.profiles` 设计草案

本 ADR 只记录设计，不创建 SQL、表或迁移：

```text
public.profiles
  id uuid primary key references auth.users(id)
  created_at
  updated_at
```

- `id` 同时是 profile 主键和用户所有权标识；
- 支持 anonymous 与 registered；
- 未来由 `auth.users` 创建触发器自动创建最小 profile；
- 触发函数必须使用 `security definer set search_path = ''`；
- 所有 SQL 对象使用完整 Schema 名称；
- 触发器失败可能阻断注册，必须有集成测试和回滚测试；
- 普通用户默认只能读取和更新自己的 profile；
- profile 删除由账户删除工作流处理，不提供普通客户端自由删除。

## 当前开放决策

以下事项保持未决定，不得当作已实现：

1. P0 是否完全不接触云端 Auth；
2. 何时从 guest 创建 anonymous；
3. 匿名用户清除 App 时的数据提示方式；
4. 首发注册方式：邮箱密码、OTP 或 OAuth；
5. Guest 本地数据迁移范围；
6. 账户删除保留期限与 SLA；
7. Data API 是关闭还是只保留受限对象；
8. Edge Functions 使用的新 API Key 体系；
9. 是否需要 CAPTCHA 和匿名登录限流。

## 后续实施边界

本 ADR 不授权创建 Supabase 项目、安装 Supabase 依赖、执行 `supabase init`、创建数据库/迁移、实现 Auth、修改移动端业务或生成原生目录。后续实施必须拆分为独立的 shared 契约、development 环境、profiles/RLS 迁移、Auth session、身份 linking、guest migration 和 deletion 测试步骤。

## 验收与回滚

本 ADR 的本轮验收是文档一致性、工作区静态检查和事实状态更新。文档变更可通过回退本轮 ADR、`CURRENT_STATUS.md` 和 `CHANGELOG.md` 变更恢复；不涉及数据库、密钥或运行环境。
