# Cursor 执行提示词：接入 AI Kitchen 最终图片素材

正式仓库：

`E:\\AutoTestTools\\Projects\\AI-Kitchen`

请先读取现有代码、Blueprint、Expo 配置和 i18n 实现，再执行。不要重建项目，不要修改与本任务无关的功能，不要实现正式登录。

## 1. 图片目录

最终素材包解压到仓库根目录后，图片必须位于：

```text
apps/mobile/assets/images/ai-kitchen/
├─ brand/
│  ├─ app-icon.png
│  ├─ adaptive-icon-foreground.png
│  └─ splash-mark.png
├─ onboarding/
│  ├─ select-ingredients.png
│  ├─ ai-recipe-plan.png
│  └─ cooking-steps.png
└─ decor/
   ├─ botanical-wave-bottom.png
   ├─ botanical-sprig-left.png
   └─ botanical-sprig-right.png
```

不要继续使用以前生成的乱码图片、带整机边框图片、写死英文图片、重复图片或旧文件名图片。项目中若已有旧版 AI Kitchen 图片，确认无引用后删除。

## 2. Expo 品牌配置

检查 `apps/mobile/app.json`、`apps/mobile/app.config.ts` 或当前实际生效的 Expo 配置文件，只修改生效的一套配置。

配置目标：

```json
{
  "expo": {
    "icon": "./assets/images/ai-kitchen/brand/app-icon.png",
    "splash": {
      "image": "./assets/images/ai-kitchen/brand/splash-mark.png",
      "resizeMode": "contain",
      "backgroundColor": "#FBF7EE"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/ai-kitchen/brand/adaptive-icon-foreground.png",
        "backgroundColor": "#FBF7EE"
      }
    }
  }
}
```

如果当前 Expo SDK 57 使用 `expo-splash-screen` 插件配置，则按项目已有方式修改，不要保留两套互相冲突的 Splash 配置。

原生 Splash 只显示图形标志。品牌名和口号放在 React Native 启动过渡页中，并通过 i18n 显示。

## 3. 启动过渡页

使用：

```ts
require('@/assets/images/ai-kitchen/brand/splash-mark.png')
```

若当前 `@/assets` 别名不可用，使用真实相对路径，不要仅为图片修改整个 TypeScript 路径体系。

要求：

- 背景色 `#FBF7EE`
- 中间显示 `splash-mark.png`
- `AI Kitchen` 和口号使用原生 `Text`
- 口号必须走 i18n
- 底部可使用 `botanical-wave-bottom.png`
- 植物装饰设置 `pointerEvents="none"`、`accessible={false}`
- 不添加手机模型边框、额外大卡片边框或图片内文字

## 4. 三页引导页

按顺序使用：

1. `onboarding/select-ingredients.png`
2. `onboarding/ai-recipe-plan.png`
3. `onboarding/cooking-steps.png`

使用静态 `require()`，不要拼接字符串动态加载：

```ts
const onboardingItems = [
  {
    key: 'ingredients',
    image: require('@/assets/images/ai-kitchen/onboarding/select-ingredients.png'),
    titleKey: 'onboarding.ingredients.title',
    descriptionKey: 'onboarding.ingredients.description',
  },
  {
    key: 'aiPlan',
    image: require('@/assets/images/ai-kitchen/onboarding/ai-recipe-plan.png'),
    titleKey: 'onboarding.aiPlan.title',
    descriptionKey: 'onboarding.aiPlan.description',
  },
  {
    key: 'cooking',
    image: require('@/assets/images/ai-kitchen/onboarding/cooking-steps.png'),
    titleKey: 'onboarding.cooking.title',
    descriptionKey: 'onboarding.cooking.description',
  },
];
```

图片要求：

- `resizeMode="contain"`
- 不裁切、不变形
- 使用 `useWindowDimensions()` 适配屏幕
- 宽度建议为屏幕宽度的 78%～88%
- 小屏设备必须给标题、说明、分页点和按钮留出空间
- 不给插画再套手机边框或整页白色大卡
- 图片只负责插画，所有文字由原生组件显示

## 5. 多语言

沿用项目现有 i18n 方案，至少补齐简体中文和英文。禁止在图片内或页面中写死双语字符串。

建议翻译键：

```text
onboarding.skip
onboarding.next
onboarding.start
onboarding.ingredients.title
onboarding.ingredients.description
onboarding.aiPlan.title
onboarding.aiPlan.description
onboarding.cooking.title
onboarding.cooking.description
profile.guest.title
profile.guest.description
profile.language
profile.terms
profile.privacy
profile.about
profile.version
```

中文：

```text
选择手边的食材
快速添加冰箱里已有的食材，我们帮你合理搭配。

让 AI 规划菜谱
根据人数、时间、偏好和过敏原，生成更适合的菜谱。

跟着步骤开始烹饪
查看清晰的食材清单和分步流程，轻松完成一道好菜。
```

英文：

```text
Choose Ingredients
Add what you already have, and we’ll help you make a balanced match.

Let AI Plan Your Meal
Get recipes based on servings, time, preferences, and allergens.

Cook Step by Step
Follow a clear ingredient list and guided steps to finish your meal.
```

“跳过 / 下一步 / 开始使用”也必须走翻译文件。

## 6. “我的”游客页

游客卡图标直接复用：

```ts
require('@/assets/images/ai-kitchen/brand/splash-mark.png')
```

在代码中放入圆形米白容器；圆形边框和阴影用 React Native 样式实现，不再维护单独的圆形徽章图片。

继续遵守当前项目决策：

- 保持游客模式
- “登录或注册”显示“即将开放”
- 不创建用户表
- 不接假登录
- 不使用固定 Token 或 Mock 账号
- 不破坏现有游客 session bootstrap
- 语言、服务条款、隐私政策、关于、版本信息正常展示

## 7. 装饰图片边界

`botanical-wave-bottom.png`：

- 仅用于启动过渡页或引导页底部
- 绝对定位到底部
- 宽度覆盖屏幕
- 不阻挡按钮点击

`botanical-sprig-left.png` 和 `botanical-sprig-right.png`：

- 只作低透明度背景装饰
- 不要每个页面同时堆满
- `pointerEvents="none"`
- `accessible={false}`

## 8. 验证

先从 `package.json` 确认真实 mobile 包名和脚本，再执行项目现有检查，至少覆盖：

```bash
pnpm --filter <真实mobile包名> typecheck
pnpm --filter <真实mobile包名> lint
pnpm typecheck
pnpm lint
```

同时验证：

1. Expo 配置可正确解析。
2. Pixel_8a 模拟器可正常启动。
3. App 图标、原生 Splash、启动过渡页、三页引导页和游客卡图标均正常。
4. 中英文切换后所有文字来自翻译文件。
5. 图片没有裁切、变形、重复边框或整机外框。
6. 首次启动显示引导页，完成或跳过后不重复显示。
7. 清除本地数据后引导页再次出现。
8. 不修改服务端身份逻辑。
9. 完成后列出实际修改文件、检查命令和结果。
10. Git commit 信息使用中文。

## 9. 停止条件

出现以下情况立即停止，不要扩大范围：

- 现有 i18n 方案与页面实现冲突，需要调整整体架构
- Expo 存在多套配置且无法确认生效文件
- 出现与本任务无关的大量历史 TypeScript/ESLint 错误
- 需要新增正式账号、用户表或登录接口
- 需要修改游客身份或服务端会话契约

停止时输出：阻塞原因、已修改文件、未完成项和建议下一步。
