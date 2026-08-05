# AI Kitchen 图片审核结果

审核范围：`AI-Kitchen-image-assets-v1(2).zip` 中全部 18 张 PNG。

## 结论

- 原始图片：18 张
- 最终保留并整理：9 张
- 删除：9 张
- 所有最终业务插画均不承载需要翻译的文字。
- 已排除重复、碗体结构异常、写死英文和透明画布污染版本。

## 逐张审核

| 原始图片 | 处理 | 原因 | 最终文件 |
|---|---|---|---|
| `03-onboarding-fridge.png` | **保留** | 冰箱与食材完整，无文字，符合最初引导页。 | `onboarding/select-ingredients.png` |
| `04-onboarding-ai-plan.png` | **保留** | 主体完整，仅有抽象 UI 图形，没有固定语言文字。 | `onboarding/ai-recipe-plan.png` |
| `05-onboarding-cooking-steps.png` | **删除** | 图片内写死英文，不符合多语言。 | `—` |
| `06-bottom-botanical-wave.png` | **保留** | 用于启动页或引导页底部装饰。 | `decor/botanical-wave-bottom.png` |
| `07-botanical-sprig-left.png` | **保留** | 左侧植物枝完整。 | `decor/botanical-sprig-left.png` |
| `08-botanical-sprig-right.png` | **保留** | 右侧植物枝完整。 | `decor/botanical-sprig-right.png` |
| `ChatGPT Image 2026年7月29日 17_52_16.png` | **保留并清理** | 完整碗体，无外框，用作启动标志和自适应图标前景。 | `brand/splash-mark.png` |
| `ChatGPT Image 2026年7月29日 18_03_31.png` | **删除** | 重复 AI 规划素材，带明显手机外壳且风格不统一。 | `—` |
| `ChatGPT Image 2026年7月29日 18_14_04.png` | **删除** | 与 AI 规划插画重复，画布冗余。 | `—` |
| `ChatGPT Image 2026年7月30日 11_23_42 (1).png` | **删除** | 碗体与环形轨道结构偏离最初设计，存在后半部分空缺感。 | `—` |
| `ChatGPT Image 2026年7月30日 11_23_42 (3).png` | **删除** | 冰箱重复文件，画布过大。 | `—` |
| `ChatGPT Image 2026年7月30日 11_23_43 (4).png` | **删除** | AI 规划重复文件，保留更干净的裁切版。 | `—` |
| `ChatGPT Image 2026年7月30日 11_23_44 (5).png` | **保留并清理** | 烹饪场景完整，步骤卡只有图形，无固定语言文字。 | `onboarding/cooking-steps.png` |
| `ChatGPT Image 2026年7月30日 11_23_44 (6).png` | **删除** | 底部波浪重复文件。 | `—` |
| `ChatGPT Image 2026年7月30日 11_23_44 (7).png` | **删除** | 左植物枝重复文件。 | `—` |
| `ChatGPT Image 2026年7月30日 11_23_45 (8).png` | **删除** | 右植物枝重复文件。 | `—` |
| `ai厨房碗叶图标.png` | **保留并规范化** | 完整碗体版本，已输出标准 1024×1024 App 图标。 | `brand/app-icon.png` |
| `ai-kitchen-onboarding-01-fridge.png` | **删除** | 与 03-onboarding-fridge.png 重复。 | `—` |

## 最终目录

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
