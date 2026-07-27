# 14 — Expo and Native Strategy

> 本文规定 Expo Managed Workflow、Development Build、Config Plugin 和原生代码的使用边界，避免项目因原生能力、SDK 升级或构建差异陷入“Expo Go 能跑但正式包失败”的状态。

| 属性 | 内容 |
|---|---|
| 文档状态 | Draft / Ready for Implementation Planning |
| 基线 | Expo + EAS Build，原生能力需要时使用 Development Build |
| 实施状态 | 未创建 Expo 项目、EAS Project 或签名 |
| 最后更新 | 2026-07-27 |

---

## 1. 决策摘要

- 使用 Expo 作为 React Native 工具链；
- P0 初期可用 Expo Go 验证纯 JS 页面；
- 一旦引入 SecureStore、通知、原生配置、监控或自定义模块，使用 Development Build；
- production 不以 Expo Go 为运行环境；
- 原生配置优先通过 app config 和 Config Plugin；
- 自定义原生代码必须有明确业务理由、iOS/Android 策略、测试和维护人；
- Expo SDK 升级作为独立任务，不与功能开发混合。

---

## 2. 为什么选择 Expo

- 跨平台构建和签名流程统一；
- 文件路由、更新、通知、SecureStore 等能力集成；
- AI 编程工具更容易理解标准结构；
- 非专业开发者减少手工修改原生工程；
- EAS 提供开发、预览、生产构建和分发；
- 仍可通过 prebuild/Config Plugin 扩展原生能力。

不选择“完全不碰原生”作为原则，因为真实发布最终涉及权限、签名、通知、隐私清单和平台差异。

---

## 3. Expo Go、Development Build、Production Build

| 类型 | 用途 | 限制 |
|---|---|---|
| Expo Go | 纯 JS 原型和页面快速预览 | 不代表正式原生依赖环境 |
| Development Build | 日常集成、真机调试、原生模块 | 需重新构建原生客户端 |
| Preview/Internal Build | staging、QA、内测 | 使用接近生产配置 |
| Production Build | 商店发布 | 正式签名、生产环境和发布门禁 |

P0 第一周可以从 Expo Go 开始，但不得把“Expo Go 可运行”作为真机发布验收。

---

## 4. App Config

使用 `app.config.ts`，根据构建 profile 解析非敏感配置：

- app name、slug、scheme；
- bundle/package identifier；
- version/build number；
- environment name；
- API base URL；
- Sentry DSN 等公开配置；
- 权限描述；
- plugins；
- update channel/runtime version。

禁止将 AI Key、Service Role Key、私钥写入 `EXPO_PUBLIC_*`、app config 或 JS bundle。

---

## 5. 环境映射

| Build Profile | Environment | App ID 后缀 | API | 分发 |
|---|---|---|---|---|
| development | development | `.dev` | dev API | 开发者 |
| preview | staging | `.staging` | staging API | 内测 |
| production | production | 无 | prod API | 商店 |

三者使用独立 Supabase 项目/Schema、Auth 用户、Secrets、AI 预算、监控环境。不得通过运行时开关让生产包访问 development 数据。

---

## 6. 包标识与 Deep Link

- Android package 和 iOS bundle ID 稳定；
- development/staging 使用不同 ID，可并存安装；
- URL scheme 按环境区分；
- Universal/App Links 在 P2 前配置；
- deep link 只携带 ID，进入后重新授权；
- OAuth redirect URI 必须按环境登记；
- 旧 scheme 变更需要兼容和发布计划。

---

## 7. 原生能力清单

P0/P1 可能使用：

- SecureStore；
- 网络状态；
- SQLite；
- Keep Awake；
- 本地通知；
- Sentry 原生集成；
- Apple/Google 登录（P2）；
- 分享/剪贴板（谨慎）；
- Haptics（非关键）。

拍照、扫码、语音属于后续功能池，不提前申请权限。

---

## 8. 权限策略

- 只在用户触发功能时请求；
- 请求前解释价值；
- 拒绝后核心非相关流程仍可用；
- 系统权限描述与真实用途一致；
- 不预申请相机、麦克风、照片和位置；
- 通知用于计时器时，在用户启用提醒时请求；
- Android/iOS 权限差异进入测试矩阵；
- 权限变更触发隐私数据地图和商店申报更新。

---

## 9. Config Plugin

需要修改 AndroidManifest、Info.plist、entitlements、Gradle 或 Pod 时，优先写可重复的 Config Plugin，而不是手工改生成文件。

Config Plugin 必须：

- 幂等；
- 有单元或 snapshot 测试；
- 明确支持的 Expo SDK；
- 在 clean prebuild 后可重现；
- 不写入 Secrets；
- 记录回滚方式。

`android/` 和 `ios/` 是否提交 Git 由 prebuild 策略决定，但不能存在“只有某台电脑手工改过”的状态。

---

## 10. 自定义原生模块准入

仅在以下条件考虑：

- Expo 官方/社区能力无法满足；
- 功能属于 P0/P1/P2 必需；
- 性能或系统集成有明确证据；
- Android/iOS 都有策略，或明确平台范围；
- 有维护成本和升级计划；
- 有真机测试；
- ADR 已记录。

禁止仅因“可能以后需要”创建自定义原生模块。

---

## 11. SDK 和依赖升级

升级步骤：

1. 单独分支/提交；
2. 阅读官方迁移说明；
3. 锁定 Node、包管理器和 Expo SDK；
4. 执行 dependency health check；
5. clean install/prebuild；
6. Android 模拟器和真机；
7. iOS 目标环境；
8. EAS preview build；
9. 回归登录、生成、本地 DB、通知、监控；
10. 更新 DECISIONS/CHANGELOG。

不得在发布前夕无必要升级。

---

## 12. EAS Build Profiles

`eas.json` 至少包含 development、preview、production。每个 profile 明确：

- distribution；
- developmentClient；
- channel；
- environment；
- autoIncrement；
- Android artifact 类型；
- iOS simulator/device；
- resource class（如需要）。

Secrets 存在 EAS/Supabase/CI Secret 管理，不写 Git。

---

## 13. OTA Update 边界

OTA 只能更新与当前 runtime 兼容的 JS/资源。不能用 OTA：

- 绕过商店审核发布重大功能；
- 修改原生权限但不重新构建；
- 修改数据库格式却没有迁移；
- 让旧客户端访问不兼容 API；
- 热修安全问题却无测试和回滚。

生产更新使用 channel + runtimeVersion + rollout。必须保留上一稳定 update，并监控 crash/error。

---

## 14. 版本号

- App semantic version：用户可见版本；
- Android versionCode / iOS buildNumber：每次构建递增；
- runtimeVersion：决定 OTA 兼容；
- Blueprint、Schema、Prompt、Rule 版本独立追踪；
- App About/诊断页可显示必要版本和 requestId，不显示 Secret。

---

## 15. 真机矩阵

P0：

- Android 模拟器；
- 一台主流 Android 真机；
- 弱网、后台、重启。

P2：

- 至少一个低/中端 Android；
- 多个 Android API/屏幕尺寸；
- iPhone 小屏和主流尺寸；
- 通知、深链、登录、更新；
- 系统语言、字体放大、深色模式；
- 从旧版本升级。

---

## 16. 本地开发命令目标

正式仓库应提供统一命令：

```text
pnpm mobile:start
pnpm mobile:android
pnpm mobile:ios
pnpm mobile:dev-build
pnpm mobile:prebuild:clean
pnpm mobile:typecheck
pnpm mobile:test
```

README 不依赖开发者记忆长命令。环境检查脚本验证 Node、pnpm、Java、Android SDK、Xcode（Mac）和登录状态。

---

## 17. 故障恢复

### Development Build 失效

- 检查 JS 与客户端 runtime 是否匹配；
- 原生依赖变化后重新 build；
- clean cache 不是默认第一步；
- 保存完整原生构建日志；
- 不通过删除 lockfile 随机升级解决。

### Prebuild 差异

- clean prebuild 比较；
- 定位 Config Plugin；
- 禁止在生成目录反复手改；
- 必要时固定 plugin 版本。

### OTA 事故

- 停止 rollout；
- 回滚上一 update；
- 若原生/API 不兼容，发布商店修复包；
- 对受影响版本设置服务端兼容或最低版本门禁。

---

## 18. Definition of Done

- [ ] development/preview/production 可独立安装和访问正确环境；
- [ ] production bundle 不含 Secrets；
- [ ] Development Build 覆盖真实原生依赖；
- [ ] Config Plugin clean prebuild 可重现；
- [ ] 权限按需申请并与隐私申报一致；
- [ ] EAS build/submit 凭据受控；
- [ ] OTA runtime 和回滚验证；
- [ ] Android 真机矩阵通过；
- [ ] SDK 升级有独立流程；
- [ ] 文档、版本和诊断信息一致。

---

## 19. 当前结论

Expo 是工程工具链，不是免除原生工程责任的捷径。AI Kitchen 将尽量保持 Managed/Config Plugin 路径，并在需要真实原生能力时尽早使用 Development Build。任何原生配置必须可重复、可测试、可构建和可回滚。
