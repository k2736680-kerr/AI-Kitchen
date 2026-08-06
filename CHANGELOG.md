# Changelog

本文件记录 AI Kitchen Blueprint、代码、Schema、数据库和发布版本的显著变化。文档版本与 App/构建版本独立；当前尚未发布到应用商店。

---

## 旧服务器最终删除与本地仓库瘦身（2026-08-06）

- 使用 MySQL 管理员权限确认 `ai_kitchen` 数据库为 0，并删除全部 2 条 `ai_kitchen_api` Host 账号记录；临时管理员密码文件随后删除。
- 服务器复查确认 AI Kitchen Compose、容器、镜像、网络、BuildKit 专用缓存、项目/证书路径、cron 和 3100/3101/443 监听全部不存在；同机 STF 与人脸搜索项目保持运行。
- 删除本地旧服务器 `deploy/server`、Dockerfile/TLS 配置和旧服务器凭据副本；Supabase 重复部署不再依赖旧服务器 `.env`，百炼 Key 留空时保留远程已有 Function Secret。
- 删除 Fastify 兼容实现中仅为旧域名服务的 ACME challenge、TLS proxy secret 和公网 HTTP 拦截逻辑；测试改用通用示例地址，活动代码不再包含旧 IP/域名运行引用。
- 清理约 2.26 GB Android build、Expo/API/Supabase 临时输出和两个旧 x86_64 APK，只保留 ARM64 Supabase APK。
- 删除重复素材包、原始 Blueprint DOCX、素材 manifest、未引用模板组件/图片和旧 ingredient `gen2` 图片。
- 文档入口合并到简化版 `README.md` / `CURRENT_STATUS.md`；Markdown 从 51 份缩减到 32 份，删除过期 MySQL、身份、竞品、素材审核、重复 ADR 和多 AI 工具专用指令。22 份编号 Blueprint 继续保留为 Schema、食品安全、隐私、测试和发布的正式依据。
- 清理后验证：全仓 typecheck、Shared 30、API 20、Mobile 配置/Session 7、Edge 3 项测试、API lint、PowerShell 部署脚本语法和 Markdown 相对链接检查通过；Mobile lint 仍在规则执行前因 hoisted AJV/ESLint `defaultMeta` 故障退出。

---

## Supabase 正式后端迁移实现与部署（2026-08-06）

- 新增 Supabase PostgreSQL migration、owner RLS、事务 RPC、SQL 安全测试和 anonymous Auth 配置。
- 新增单个 `api` Edge Function，保持现有七个 `/api/v1` REST 接口；生产 URL 改为 Supabase 托管 HTTPS。
- 抽取 `@ai-kitchen/server-core`，Fastify 与 Edge 共用 DashScope Provider、Prompt、GenerationService 和校验链；新增 Edge bundle 构建。
- Mobile SecureStore 增加 Supabase refresh token，并在 access token 临近过期时自动刷新；共享身份响应允许 JWT 长 token 和可选 refresh token。
- 新增 `deploy/supabase/deploy.ps1`、Git 忽略的授权文件和部署说明；只有远程 Health 通过后才切换 Mobile production Base URL。
- 用户确认当前无真实用户/保留数据，故不迁移旧 MySQL 数据或自定义 Guest Token；旧 Fastify/MySQL 暂作切流回滚。
- 验证：PostgreSQL 语法解析、Edge Deno check、PowerShell 语法、Server Core/API/Mobile/Shared typecheck；Shared 30、API 22、Mobile Session 3、Edge 3 项测试通过。远程 Supabase/RLS/真实 AI/真机仍待授权后执行。
- **后续部署完成**：项目 `dthfeeafcecfmxghjnbo` 已在首尔区域上线，anonymous Auth、migration、DB lint、Function Secrets、Edge Function 和 DB SSL enforcement 已完成；真实 Guest/Refresh/Generate/Recipe/History/Visit 与跨游客隔离通过。
- 新增 migration `202608060002_restrict_direct_table_access.sql`：撤销 authenticated/anon 的业务表和序列直连权限，只保留 owner 来自 `auth.uid()` 的受控 RPC；携带有效游客 JWT 直连 PostgREST 实测返回 403，真实生成链路仍通过。
- Mobile production 已切换 Supabase Base URL；新增 ARM64 Release APK `artifacts/android/ai-kitchen-1.0.0-arm64-supabase.apk`，只含 `arm64-v8a`、不含旧域名，SHA-256 `E5DC01E35CC6F740912CF23A0812EAA17187883A402A1759B936A4B49D505AD9`。
- 旧 `10.0.30.171` 服务已停用并清理：删除 AI Kitchen 容器、4 个专用 API 镜像、网络、代码、服务端 Secret、证书、acme 自动续期、专用 BuildKit 缓存、`ai_kitchen` 数据库、全部 `ai_kitchen_api` Host 账号和本地旧服务器 `.env` 凭据副本，3100/3101/443 已无监听；同机另外两个 Compose 项目保持健康。当前无在线 ADB 真机，APK 安装验收待设备连接。

---

## 长期在线服务器部署与仓库清理（2026-08-06）

- 新增 `apps/api/Dockerfile` 与 `deploy/server` Docker Compose 部署路径；API 使用多阶段构建、`restart: unless-stopped`、数据库健康检查、日志轮转、只读文件系统和最小 capabilities，不再依赖开发电脑常驻。
- API 构建新增 `dist/migrate.js`，服务器以独立一次性 migration 容器执行正向迁移；部署脚本为每次构建生成唯一镜像标签，健康失败时恢复上一 API 镜像，回滚后再次验证数据库和 Provider 状态。
- 新增独立 Docker Nginx TLS 入口：服务器内部 API 保持 HTTP `3100`，公网只通过 `443` 提供 HTTPS；TLS 容器使用服务器缓存镜像、独立加载被 Git 忽略的证书，不修改主机现有 80 端口 Nginx。MySQL 3306 明确禁止直接暴露公网，跨网络连接需 VPN/专线。
- API 已部署到 Ubuntu 22.04 x86_64 `10.0.30.171`，公钥登录与 Docker 权限可用；Docker 28.1.1 / Compose 2.35.1 常驻运行健康容器。API 与 MySQL 同机，使用 host network 和 `127.0.0.1:3306`，无需扩大 `ai_kitchen_api` 到 Docker bridge 网段的授权。
- 服务器 Docker Hub 出口不可用，Dockerfile 改用 AWS Public ECR 的官方 Docker Library Node 24 镜像，npm/pnpm 使用 `registry.npmmirror.com`；服务器首次构建与后续缓存重建通过。
- 内网穿透目标由旧电脑 `10.0.30.221:3100` 切换为服务器 `10.0.30.171:3100`，公网 HTTP Health 已返回 200；HTTPS 需要另将公网 443/TLS 转发到服务器 `10.0.30.171:443`，验收通过后关闭公网到 `3100` 的 HTTP 规则，正式 Mobile 不降级为明文 HTTP。
- TLS 部署脚本新增域名覆盖与证书/私钥匹配门禁，并支持 `--https-only` 在不重建健康 API 的情况下启动入口。用户提供的 `*.moyoung.com` 证书链和私钥本身有效，但不覆盖 `kerr.test.moyoung.com`，因此未启动错误证书；需提供该精确域名或 `*.test.moyoung.com` 证书。
- Mobile production/staging remote 模式强制使用 HTTPS，错误 HTTP 配置会被清空并在游客会话初始化前显示配置错误；仅 development loopback 可使用 HTTP。
- 真实生成首次发现百炼把 `cuisine/flavor` 输出成中文枚举，导致两次 repair 累计超过 40 秒；强化 Prompt 的固定英文 ID 约束并补回归断言后，真实 Guest Session → 3 候选生成 → MySQL → History 在约 16.1 秒成功，3 个候选均保存且未 repair。
- 新增被 Git 忽略的服务器 `deploy/server/.env` 和 Mobile `apps/mobile/.env.production`；服务端文件留出 MySQL 与 DashScope 占位值供用户填写，客户端只保存公网 API 地址。
- 清理旧 Web 导出/预览服务、临时日志、旧 APK 与过期 `HANDOFF_2026-08-05.md`；正式 Blueprint、ADR 和状态文档保留，并增加生成目录忽略规则。
- 验证：API typecheck、lint、6 个测试文件 20 项、server/migrate 构建、部署 shell 与 Compose、Linux Docker build、migration、健康检查、内网真实 AI/History、公网 HTTP Health、Mobile typecheck、HTTPS 配置测试 4 项、服务器 Nginx 配置检查及本机临时 `8443 HTTPS → 3100 HTTP` 冒烟通过；公网 HTTPS 待正确域名证书和网关 443 转发。

---

## Mobile 流程响应与视觉一致性优化（2026-08-06）

- 新增共享 `ScreenList`，将首页食材、探索、历史和多做法候选页改为单一纵向虚拟列表，移除虚拟列表嵌套普通 ScrollView 的运行警告。
- 首页 166 项食材目录按窗口分批渲染，食材卡使用 memo；首页和探索搜索使用 deferred query，使输入即时反馈与筛选计算解耦。
- 探索菜谱、历史记录和多做法候选卡增加稳定 render callback、合理的首批/批次/window 参数和 Android clipped-subview 优化。
- 新增统一 `SelectionChip`，分类、人数、时间、厨具、饮食偏好、过敏原、忌口与探索筛选共享选中渐变、按压反馈、可访问状态和最小触控高度。
- `Screen`、`AppCard`、`AppButton`、`StatusMessage` 全部改用当前主题语义色；补齐 light/dark 的 danger、warning、success border 与 on-primary token，消除公共组件在深色模式下残留亮色背景的问题。
- 主题 Provider 启动时先渲染系统主题，再异步恢复持久化模式，不再以空树阻塞首屏。
- Pixel_8a release 视觉复核覆盖首页、探索、历史空状态、深色首页、深色首次引导和深色“我的”页；首次截图发现并修复食材图片容器缺少 92×92 尺寸造成的双列卡片异常拉伸。现有素材满足本轮需求，未新增生成图片。
- 验证：Mobile `tsc --noEmit` 通过；6 个相关测试文件共 18 项通过；x86_64 `assembleRelease`、安装、无 Metro 冷启动通过，两次冷启动 `TotalTime=1022ms / 718ms`；运行日志无 `VirtualizedLists`、AndroidRuntime、Expo 或 ReactNativeJS fatal。
- 优化版模拟器 APK：`artifacts/android/ai-kitchen-1.0.0-x86_64-optimized.apk`，SHA-256 `BA3CEF05925EEAC87AA3B52A1CFC3FB27ED3BEA4F52B823652B370C236AE2E45`。仍为 debug keystore / x86_64，不用于商店或 ARM 真机发布。
- `expo lint` 仍因 hoisted `@eslint/eslintrc` / AJV `defaultMeta` 初始化问题在规则运行前失败，未隐藏或转为 skip。

---

## Android 本地打包链路恢复（2026-08-06）

- 清理遗留 Vitest、CMake/Ninja、并发 pnpm 和旧 WorkBuddy 删除任务造成的 Windows 文件锁，修复 `ERR_PNPM_EPERM`、损坏的 `react-native-screens` hoisted 目录及 `build.ninja still dirty`。
- 根 `package.json` 新增 Windows-only postinstall，调用 `scripts/relink-mobile-dependencies.cjs` 将版本一致的 Mobile junction 指向短 hoisted 路径；非 Windows 平台不执行链接调整。
- Mobile Expo 自动链接增加 monorepo 根 `node_modules` 搜索路径；`expo-linear-gradient` 由 15.x 升至 SDK 57 对应的 57.0.1，修复启动时缺少 `LazyKType` 的原生崩溃。
- Expo prebuild 将 Mobile `android` / `ios` 脚本切换为 `expo run:*`；Android 原生目录继续由 prebuild 生成，不作为手工维护源文件。
- 使用 Node 24.14.0、pnpm 11.14.0、JDK 21、Gradle 9.3.1 和 Android SDK 36/Build Tools 37 完成 x86_64 debug 与 standalone release 构建。
- Release APK 已安装到 `Pixel_8a / emulator-5554` 并在无 Metro 状态下启动；未发现 AndroidRuntime / Expo / ReactNativeJS fatal。产物：`artifacts/android/ai-kitchen-1.0.0-x86_64-standalone.apk`，SHA-256 `F7DB4BDB1B81DB0F4156B3B8D64E509190ABE57A12A81B80FE51A4BC0770FF9E`。
- 当前 release 使用 debug keystore 且只包含 x86_64，仅用于模拟器验收，不是商店或 ARM 真机发布包。
- 验证中 Mobile typecheck 通过；`expo lint` 因 hoisted `@eslint/eslintrc` / AJV 初始化异常在规则执行前失败，保留为显式未解项。

---

## P0 体验优化：烹饪计时器与空状态引导（2026-08-05）

- **烹饪计时器**：`features/cooking/cooking-step-card.tsx` 在步骤含 `durationMinutes` 时渲染可点击倒计时（开始 / 停止，mm:ss 实时显示，结束提示），纯前端 `setInterval` 实现，无新依赖；该组件在 `/cooking/[recipeId]` 当前步渲染，补齐下厨房 / 美食杰 / SideChef 同款逐步引导计时能力。
- **历史空状态引导**：新增 `components/empty-state.tsx` 通用空态组件（图标 + 标题 + 引导文案 + 操作按钮）；`(tabs)/history.tsx` 在无记录时展示引导并提供「去生成菜谱」入口。
- **i18n**：zh-CN / en-US 新增 `recipe.timer.*` 与 `history.goGenerate` 文案。
- **验证**：mobile `tsc --noEmit` EXIT=0。Android 原生构建仍被 Windows 环境阻塞（见 HANDOFF），计时器与空状态暂以 Web 预览 / 类型检查验证，待上机实测。

---

## 多方案生成、食材扩容与本地持久化（2026-08-04）

### 多候选菜谱生成（核心）

- **契约变更（破坏性）**：`GenerationApiSuccessSchema.recipe`（单个）改为 `recipes`（1-5 个数组）；`recipe` 保留为 deprecated 可选字段兼容旧 replay payload。新增 `GenerationMetadata.candidateCount`。
- **Schema 新增维度字段**：RecipeSchema 增加 `cookingMethod`（stir-fry/stew/steam/soup/cold/roast）、`cuisine`（11 个菜系）、`flavor`（7 种口味），均带 `.default()` 兼容旧 JSON 快照；`difficulty` 增加 `hard`、`spiceLevel` 增加 `hot`。
- **生成请求扩展**：`GenerationRequest` 新增 `candidateCount`（默认 4）与 `excludedRecipes`（"再来一批"去重，参与 requestHash 形成新幂等域）。
- **后端批量生成**：`RecipeProvider.generate` → `generateBatch`，按候选数并发调用 DashScope（每次指定一种烹饪方式），`Promise.allSettled` 容忍部分失败、全部失败抛出首个错误；采样参数默认 `temperature 0.8 / topP 0.9`（原 0.2/0.8，环境变量可覆盖）。
- **prompt 重写**：`recipe-prompt.ts` 移除"只能输出一份"限制，新增烹饪方式约束、历史排除列表、调料豁免说明；repair 流程保持单候选，单批最多修复 2 个。
- **服务端校验**：候选逐个走 Schema + 安全 + 语言校验，按 `(cookingMethod, title)` 去重；`saveRecipeSuccess` 改为批量事务内逐条 upsert recipes + history。
- **数据库迁移 004**：`ai_kitchen_recipes` 增加 cooking_method/cuisine/flavor 结构化列并回填；旧 `response_payload` 单 recipe 回填为 recipes 数组（含 down 迁移）。

### 食材库扩容

- 标准食材从 39 种扩至 **166 种**：新增水果（15）、调料（27，含油盐酱醋糖料酒蚝油等）、香料（10，葱姜蒜八角桂皮等）类目，蔬菜/肉蛋/水产/豆制品/主食大量补全。
- `IngredientDefinition` 新增 `isCondiment` 标志；resolver 对调料类食材豁免"必须来自已选"约束，主食材仍强制来自已选。`INGREDIENT_CATEGORIES` 增加 fruit/condiment/spice。

### 移动端

- **新增方案列表页 `/recipe-list`**：生成成功展示 3-5 个不同烹饪方式的候选卡片（做法/菜系/用时/难度/口味），点按进详情；「换个做法再来一批」通过 `excludedRecipes` 去重。
- **P0Store 持久化**：新增 `state/p0-persist.ts`（AsyncStorage，300ms 防抖写回 + 挂载 hydrate），历史、菜谱缓存（上限 50）、最近浏览（10）、烹饪进度、收藏、偏好跨进程保留；transient 生成状态不入库。
- **收藏功能**：详情页新增收藏按钮，纯本地 `favoriteRecipeIds`；探索页支持收藏夹筛选。
- **探索页重写**：搜索框 + 难度/用时筛选 chips + 收藏夹切换 + 下拉刷新。
- **设置页补齐**：外观（跟随系统/浅色/深色）选择、服务条款/隐私政策入口、清除本地数据。
- **暗色模式贯通**：`theme.ts` 新增真实暗色调色板 `PaletteDark`，新增 `theme/app-theme.tsx` 主题 Provider（模式持久化），核心组件/tab 栏跟随主题。
- **about/terms/privacy** 补齐真实文案（移除占位）。

### 测试

- shared：fixtures 数量断言更新至 166；新增 condiment 豁免/主料缺失用例；generation API 数组契约用例。
- api：provider 批量并发/全失败抛错用例；persistence 批量事务回滚用例；app.test 全量适配 recipes 数组。
- mobile：reducer 多候选存储/失败清空/收藏 toggle 用例；local repository 数组契约；食材搜索用例适配新目录。
- 全量 63 个测试通过；shared/api/mobile 三包 typecheck 通过。

---

## 首页食材选择与目录丰富度

- 移除通用页头右上角重复的设置按钮；语言切换统一从“我的” Tab 中进入。
- 标准食材卡片现为双向切换交互：首次点击选中，再次点击直接取消；并同步更新当前会话的生成草稿。
- 标准食材从 10 项扩展到 36 项，新增水产、豆制品和乳制品分类，并为新目录补齐中英文名称、常用别名及已支持的过敏原映射。
- 首页每个标准食材卡片显示随 App 打包的统一风格缩略图，不依赖运行时网络；选中状态增加勾选图标、文字和屏幕阅读器提示。
- 新增食材点击切换回归测试，并在 Pixel_8a 模拟器完成首页图片显示、选中、二次点击取消与目录底部图片的手工验证。

---

## API 正式构建产物启动修复

- API esbuild 构建继续输出 Node ESM，但不再把 dotenv、Fastify、mysql2、Zod 等第三方运行时依赖打入单文件；workspace shared 源码仍随 API 编译，部署时从已安装的锁定依赖解析运行时包。
- 修复 dotenv CommonJS 在单文件 ESM bundle 中触发 `Dynamic require of "fs" is not supported`、导致 `pnpm start:api` 无法启动的问题。
- 新增构建产物启动冒烟命令：使用临时本地端口启动 `dist/server.js`、校验 Health、终止进程并确认端口释放；不调用 AI 生成接口。

---

## Mobile 品牌启动页与首次引导

- Mobile Expo 资源配置已切换到最终 AI Kitchen 品牌素材：应用图标、Android adaptive icon 和 native splash 不再使用默认 Expo 图。
- App 启动后的过渡页已替换为品牌 splash mark、产品名、i18n slogan 和植物装饰图；中英文 slogan 由 `src/i18n/resources.ts` 提供，不写死在图片中。
- 新增三页首次启动 onboarding，使用本地静态 `require()` 插图与现有主题色；完成或跳过后仅在本地 AsyncStorage 标记，清除应用数据后会重新出现。
- 修复 onboarding 作为普通 React 覆盖层时被原生 NativeTabs 压住并拦截触摸的问题：onboarding 现为独立 Expo Router Stack 页面，根 Navigator 保持挂载，完成标记写入成功后才替换到首页；Skip 与三步完成均稳定进入四 Tab 主应用。
- Onboarding 改用 `react-native-safe-area-context`，并在 Expo Go 开发模式为悬浮 Tools 热区留出 Skip 点击空间；正式构建布局不受该开发态避让影响。
- Profile 来宾卡片复用品牌 splash mark 作为图标容器视觉，保持现有 guest-only 产品边界，不新增登录、注册、账号恢复或服务端身份改动。

---

## 游客版“我的”Tab 与产品信息入口

- 暂停身份阶段 2：本轮未新增 registered 身份、用户表、登录注册 API、密码哈希、账号认领、登出或删除账号逻辑，也未改动现有 guest session 机制。
- Mobile 底部导航新增第四个 Tab：`我的 / Profile`，并保持现有 Home、Explore、History 主流程不变。
- 新增游客版 Profile 页面，展示 guest mode 说明、账号功能即将开放提示、语言入口、服务条款、隐私政策、关于和统一版本信息；点击“登录或注册”仅弹出轻提示，不创建假登录页面。
- 新增 `/legal/terms`、`/legal/privacy` 和 `/about` 页面；前两者是明确标注的开发占位页，禁止作为正式法律文本上线。
- App 版本读取统一收敛到 Mobile 共享 helper，避免设置页、关于页和 Profile 页出现不同的硬编码版本。

---

## 游客身份与服务端会话基础

- 新增服务端生成的 UUID guest identity 和 `ai_kitchen_guest_identities`、`ai_kitchen_sessions` MySQL migration；session token 使用 `crypto.randomBytes(32)` 生成，数据库只保存 SHA-256 hash。
- 新增 `POST /api/v1/auth/guest-session`、`GET /api/v1/auth/session`，默认 TTL 为 180 天，可由 `SESSION_TTL_DAYS` 配置。
- Generation、动态 recipe detail、History、history visit 统一从 Bearer session 推导 guestId；旧请求字段只兼容接收，不再作为所有权依据。
- Mobile 使用 Expo SecureStore 保存 token，并通过单例 bootstrap Promise 保证 App 重启恢复同一 guest、并发页面不重复创建会话。
- 本轮未实现注册登录、refresh、账号删除、anonymous 或 registered；旧身份加固前 raw guest 数据不自动认领。

## 用户身份与数据所有权方案

- 新增 `docs/adr/0004-user-identity-and-data-ownership.md`，完成当前 guestId、现有 MySQL 记录关系、数据所有权、guest 升级、已有账号登录、退出和删除账号的架构审计。
- 正式身份模型确定为 `guest` / `registered` 两态；不保留 `anonymous` 作为独立产品状态。当前 P0 仍只提供游客体验，不新增用户表 migration、认证 API、登录注册页面或伪用户。
- 明确后续服务端必须从验证后的会话确定 owner，guestId 不能作为正式安全凭证；生成请求、菜谱、历史、收藏、偏好和安全条件在账号化后归身份主体，语言、缓存和临时烹饪进度可保留在设备本地。
- 明确 guest 注册和登录已有账号都必须用户确认后执行幂等合并；保持 recipeId 和可审计合并记录，冲突不静默覆盖；账号删除、服务条款、隐私政策和“我的”Tab只完成边界设计。
- 本轮仅修改 ADR、决策索引、当前状态和变更记录，未修改 API、数据库、migration、Provider、Mobile 业务代码或设备配置。

---

## 动态菜谱多语言契约

- `GenerationRequest v1` 新增受限 `locale`，新版 Mobile 明确提交 `zh-CN` 或 `en-US`，旧请求兼容默认 `zh-CN`；locale 纳入已有稳定 request hash 与幂等语义。
- `RecipeSchema` 新增内容生成语言 `recipe.locale`，服务端在 Schema 校验后按请求注入并保存；旧 MySQL 快照和旧 API payload 缺失时默认 `zh-CN`，不进行静默翻译。
- Provider Prompt、一次 repair 调用和轻量语言一致性校验按 locale 约束自然语言正文；错误语言修复一次后仍不合格即失败关闭，未校验原始输出不保存。
- History API、Remote Repository、session recent recipes 和 Explore 按 `recipe.locale` 过滤，切换 UI 语言重新读取对应历史，不删除另一语言菜谱。
- 新增 `002_add_recipe_locale` migration：generation request/recipe 均保存 locale，recipes 增加 locale 查询索引；真实 MySQL migration 已执行并复跑验证。

---

## 修复食材目录多语言显示

- 标准食材目录由中文 `displayName`/别名展示值改为稳定 `id`、`category` 与 `zh-CN`/`en-US` 本地化名称、别名；10 项标准食材均已补齐双语资源。
- Mobile 的食材网格、已选 Chip、生成摘要、菜谱食材和缺少食材提示统一通过 presentation formatter 解析当前语言；自定义食材继续保留用户原始文本。
- 当前语言搜索仅匹配该语言名称和别名，忽略大小写并清理首尾空格；跨语言目录值不会泄漏到当前界面。分类继续使用稳定 `categoryId` 与既有 i18n 文案。
- 新增目录完整性与中英文搜索单元测试；Pixel_8a 已验证英文不再显示中文食材/别名、切换中文后立即显示中文名称与别名、再切回英文即时刷新。

---

## 移动端产品化 UI/UX 与多语言

- 建立 Mobile 设计令牌与共享组件：暖色背景、白色卡片、sage 主操作、统一字号/间距/圆角/阴影和语义状态提示。
- 重构首页、生成条件、生成中/无匹配、菜谱详情、分步烹饪、Explore 与 History 的页面结构；清理展示层中的内部食材 ID、`\\n` 字符和重复产品提示。
- 新增 `zh-CN`/`en-US` 国际化、按设备语言的首次默认值、设置页即时切换与 AsyncStorage 本地保存；稳定业务枚举保持不变并由 UI 映射为本地化文案。
- 新增 `docs/MOBILE_DESIGN_I18N.md` 记录设计系统、语言策略和不改变 API/生成边界的约束。

---

## 内网 Fastify + MySQL 菜谱生成服务

- 补齐 Windows 内网 MySQL 本地环境模板，health 在成功连接时返回 `database: "connected"`；环境解析忽略无关系统变量，并允许空的百炼 Base URL 使用默认兼容地址。
- 本地 `apps/api/.env` 由 `.gitignore` 排除，仅保留待用户填写的 `MYSQL_PASSWORD`；真实数据库 migration 与 health 联调尚未执行。
- 正式后端从 Supabase Edge 原型迁移至 `apps/api`：Node.js、TypeScript、Fastify、MySQL 原生 migration 和阿里云百炼 `qwen3.7-plus` Provider。
- 新增 `/api/v1/health`、生成、recipe 读取、guest history 查询与 visit upsert；生成采用 MySQL 幂等、校验后 recipe snapshot 保存和事务式历史更新。
- Shared 契约增加远程 recipe/history DTO 与 `idempotency_conflict` 状态；Mobile Remote Adapter 改用 `/api/v1` 和 `EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL`，支持远程历史与动态菜谱缓存。
- 删除不再作为正式运行路径的 Supabase Edge Function 与 PostgreSQL migration；D-016 记录内网 Node.js + MySQL 决策。
- 尚未填写真实阿里云/内网 MySQL/Mobile 地址，因此真实 Provider、数据库和 Pixel_8a remote 联调未执行。

---

## 版本化后端菜谱生成 API

- 新增共享 Zod API 契约 v1：`GenerationApiRequest`、`GenerationApiResponse` 判别联合、Recipe 输出 Schema、错误码、版本常量和严格未知字段策略。
- 新增 `POST /functions/v1/recipes-generate` Edge Function，支持 CORS、请求校验、guest 身份边界、限流、幂等、deterministic/HTTP Provider、一次修复、超时、失败关闭和结构化最小日志。
- 新增 `generation_requests` migration，使用唯一 `idempotency_key` 和 RLS 默认拒绝；development 可显式使用单进程 memory store，生产应使用 Supabase service-role REST store。
- Mobile 生成状态机改为依赖 `RecipeGenerationRepository`，支持 development local/remote 配置、Remote API Adapter、45 秒超时、取消、错误映射和远程 Recipe 缓存。
- 当前未配置真实 Provider、未调用真实 AI、未部署 Supabase、未执行真实 Edge Runtime/容器联调；相关实现状态和启动命令见 `docs/API_GENERATION.md`。

## P0 固定数据原型：完善饮食偏好与安全生成条件

- 共享包新增 `GenerationRequest` v1，统一承载食材、人数、最大烹饪时间、可用厨具、饮食偏好、过敏原和忌口；页面与本地生成器不再各自定义请求字段。
- 生成条件页新增素食、清淡少辣、简单易做、均衡饮食多选，已知过敏原多选，以及基于标准食材 ID 的忌口多选；所有选择支持取消和清除，并保留在当前会话。
- Store 新增偏好、过敏原、忌口 actions，并在生成开始时保存不可变请求快照；生成中重试会创建新的请求快照。
- 本地确定性生成按食材→时间→厨具→偏好→过敏原→忌口筛选 Fixture；过敏原和忌口不会被普通偏好或兜底结果绕过，无安全候选进入无匹配结果页。
- Recipe Fixture 集中补充饮食标签、过敏原标签、难度、辣度和所需厨具；菜谱详情展示饮食标签与过敏原提示。
- 本阶段仍未接真实 AI、后端/API、数据库、持久化或云端同步；用户负责后续完整功能体验和验收。

## P0 固定数据原型：打通食材生成菜谱主流程

- 首页到生成条件、生成中、本地确定性匹配、无匹配结果、菜谱详情和开始烹饪已实际连通。
- 生成条件使用现有 Store 保存，支持人数、最大烹饪时间和可用厨具的默认值与修改；首页支持清空全部已选食材。
- 本地生成服务通过现有 Repository 读取菜谱，根据所选食材、时间和厨具匹配；无匹配进入正式空结果页，不会把所有输入返回同一菜谱。
- 生成中支持取消、成功自动跳转、失败重试、重复提交保护和卸载清理；成功生成或打开详情会更新当前会话 `recentRecipes`。
- 新增 Blueprint P0 历史基础页与底部“历史”Tab，按最近访问顺序去重展示当前会话记录。
- Pixel_8a 已在 Metro 8083 完成基础冒烟：首页选食材→修改条件→生成→详情→开始烹饪→完成一步。
- 本阶段仍为本地原型：未持久化、未接真实 AI、未接后端/API、未实现云端历史或登录同步；用户负责后续完整功能体验和验收。

## P0 固定数据原型步骤 2A

- `@ai-kitchen/shared` 增加正式源码根入口，mobile 声明 `workspace:*` 依赖。
- 已验证 Workspace 链接与 TypeScript 导入；未增加构建产物、路径映射、Repository、Store 或页面。

## P0 固定数据原型步骤 2

- 新增 mobile Fixture Repository 和 session guest namespace 内存状态。
- 支持食材搜索、选择、自定义添加及重复校验，以及生成草稿、最近菜谱和烹饪步骤状态。
- 状态未接入正式页面，App 重启后不保留；未接入 Supabase、Auth、数据库、API 或 AI。

## P0 固定数据原型步骤 3

- 根布局接入 P0 Store；首页支持固定食材分类、搜索、选择、移除和自定义添加。
- 新增生成条件页，支持人数、时间、厨具和当前会话草稿保留。
- Pixel_8a 验证 Metro 加载和首页内容；未实现生成中、菜谱详情、历史或烹饪模式。
- 用户确认 Pixel_8a 已完成中文搜索、清空恢复、标准重复、自定义食材添加/重复/移除、Explore 和返回 Home 状态保留验收；中文输入通过电脑键盘完成。

## P0 固定数据原型步骤 4

- 完成固定生成中、固定失败与重试、取消异步清理、固定菜谱详情及 `NOT_FOUND` 状态代码路径。
- Pixel_8a 已完成生成路由和固定菜谱详情基础冒烟验证。
- 完整成功、取消、失败重试和缺少食材端到端交互尚未执行，转入后续自动化测试阶段。
- 最近菜谱仅为当前会话内状态；未接入真实 AI、API、Supabase、数据库、营养数据库或食品安全规则引擎；烹饪模式和历史页面尚未实现。

## P0 固定数据原型步骤 5A

- 补齐当前会话内结构化烹饪会话状态，支持按菜谱恢复当前步骤、记录已完成步骤、完成状态、重新开始及进度选择器。
- 未创建烹饪页面或路由；步骤 5B 实现页面与交互。状态不持久化，未接入后端或数据库。

## P0 固定数据原型步骤 5B

- 实现烹饪模式页面与步骤交互，复用 5A cooking session Store，支持进度、步骤状态、完成态、退出保留和重新开始。
- Pixel_8a 基础冒烟通过：独立 Metro 端口 8083 下基础 Expo 页面及 `/cooking/fixture-tomato-egg-noodles` 实际渲染。
- 完整烹饪端到端流程转入后续自动化测试，未接入持久化或后端能力。

## P0 固定数据原型后续切片：Explore 与会话内菜谱浏览

- 将 Explore starter 页替换为固定菜谱浏览页，支持最近菜谱空状态、固定菜谱卡片和进入菜谱详情。
- 最近菜谱复用现有会话 Store；未实现持久化、云端历史或收藏。
- Pixel_8a 已验证 `/explore` 页面实际渲染。

## P0 固定数据原型步骤 1

- 新增 Ingredient、Generation 与 Recipe 最小共享契约。
- 新增 10 条固定食材、3 条固定 Recipe Fixture（含缺少食材示例）和固定错误 Fixture。
- 新增 Fixture 契约测试；未实现移动端页面、本地 Store、AI、Supabase、Auth、数据库、营养或食品安全引擎。

## [Unreleased]

### Added

- pnpm 11.14.0 Workspace：根配置、`apps/mobile`、`packages/shared`、`pnpm-lock.yaml` 与项目本地 `.pnpm-store`；
- Expo SDK 57 默认 Expo Router 模板，应用元数据为 AI Kitchen；
- 最小 `@ai-kitchen/shared` 空模块与直接 TypeScript 开发依赖；
- Expo Flat Config ESLint、CSS TypeScript 模块声明与 Web hydration Hook 修复。

### Validated

- `pnpm install` 与 `pnpm install --frozen-lockfile`；
- Expo Doctor 20/20；
- mobile/shared/root TypeScript 与 mobile/root ESLint；
- `Pixel_8a` Android 模拟器上的 Expo Go 默认 Home 页面和 Explore 路由切换；
- 未生成 Android/iOS 原生目录。

### Notes

- 本轮只完成工程初始化和默认模板验证；未实现业务页面、固定 Recipe Fixture、Supabase、Auth、数据库、AI、Food Safety、Nutrition、同步、测试体系或发布配置。

### Architecture Decision

- 新增 `docs/decisions/ADR-0001-identity-data-ownership.md`，明确 guest、anonymous、registered 边界、anonymous 升级保持 `auth.users.id`、`owner_id = auth.uid()`、RLS 默认拒绝、User-scoped/Admin Supabase client 与 API Key 安全边界。
- 明确本轮未实现 Auth、Supabase、数据库、迁移或业务功能。
- 新增 `docs/decisions/ADR-0002-environment-secret-boundary.md`；
- 新增 `apps/mobile/.env.example`，仅包含公开占位变量；
- 增强 mobile 环境文件忽略规则；
- 明确未创建真实 Supabase 资源、环境变量或 Secret。
- 新增 `@ai-kitchen/shared` 的 guest、anonymous、registered 身份 Subject 类型与纯类型守卫；
- 新增稳定 API 错误码、成功/失败 Envelope 及 10 项 Vitest 单元测试；
- 本步骤未实现 Supabase、真实身份服务、Auth、数据库或业务功能。

---

## [1.0.0] — 2026-07-27

### Added — Phase 2

- `08_RULE_ENGINE.md`：集中式确定性规则、findings、冲突、版本、回放、灰度和失败策略；
- `09_FOOD_SAFETY_RULES.md`：过敏、非食用物、加热、储存、来源、撤回和零放行测试；
- `11_NUTRITION_ENGINE.md`：营养来源、单位、克重、覆盖率、置信度、Snapshot 和降级；
- `12_PRIVACY_DATA_MAP.md`：数据分类、第三方 AI、日志、保留、删除、供应商和商店映射。

### Added — Phase 3

- `13_MOBILE_APP_ARCHITECTURE.md`；
- `14_EXPO_AND_NATIVE_STRATEGY.md`；
- `15_UI_UX_SYSTEM.md`；
- `16_STATE_MANAGEMENT.md`；
- `17_LOCAL_STORAGE_AND_SYNC.md`；
- `18_TEST_STRATEGY.md`；
- `19_OBSERVABILITY.md`；
- `20_DEPLOYMENT_AND_RELEASE.md`；
- `21_STORE_COMPLIANCE.md`。

### Added — Phase 4

- `.cursor/rules/` 五份 Project Rules；
- `CLAUDE.md`；
- `AGENTS.md`；
- `CODEX.md`；
- `CHATGPT_PROJECT_INSTRUCTIONS.md`；
- `HANDOFF_TEMPLATE.md`；
- `BLUEPRINT_COMPLETION_REPORT.md`。

### Changed

- README 升级为完整文档索引；
- `CURRENT_STATUS.md` 标记 Blueprint 完成、代码未开始；
- `PROJECT_STATE.md` 进入准备 P0 固定数据原型状态；
- `AI_CONTEXT.md` 更新真实状态和下一任务；
- `00_PROJECT_MASTER_PLAN.md` 标记 Phase 0 文档完成；
- `DECISIONS.md` 新增 D-020 至 D-026；
- Blueprint 版本升级为 1.0.0。

### Validated

- 计划文件全部存在；
- Markdown 代码块闭合；
- 相对链接检查；
- 旧“Phase 2 进行中/6 of 10”状态清理；
- 完整 ZIP 结构和完整性检查。

### Notes

- 本版本只有文档和 AI 工具规则；没有可运行 App、数据库、API、AI 接口或生产配置。

---

## [0.2.0] — 2026-07-27

### Added

- `03_DATABASE_DESIGN.md`；
- `04_API_CONTRACT.md`；
- `05_AUTH_AND_IDENTITY.md`；
- `06_AI_ENGINE.md`；
- `07_PROMPT_ENGINEERING.md`；
- `10_RECIPE_SCHEMA.md`。

### Confirmed

- Versioned REST 和 request status recovery；
- server-verified ownership；
- Candidate/Final Recipe 分离；
- Prompt Registry 和版本化工程资产。

---

## [0.1.0] — 2026-07-24

### Added

- 第一阶段 10 个治理、产品和架构文档；
- 初始 15 项架构决策；
- 第二至第四阶段文档路线。

### Confirmed

- React Native + Expo + TypeScript；
- Android 优先；
- Supabase Edge Functions + PostgreSQL + RLS；
- App 不直接调用模型；
- 共享 Schema；
- 标准食材 ID；
- AI 四层校验；
- Food Safety 失败关闭；
- requestId/idempotencyKey；
- 三环境隔离。

---

## 维护规则

- Added：新增用户能力、文档、API、表、规则、测试或工具；
- Changed：改变已有行为、字段、架构或流程；
- Fixed：修复可定位问题；
- Security：密钥、权限、越权、过敏或食品安全；
- Deprecated/Removed：明确弃用/移除和迁移。

禁止记录计划却写成完成，禁止使用“优化了一些内容”这类不可追踪描述。
