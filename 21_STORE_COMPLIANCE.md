# 21 — Store Compliance and Release Readiness

> 本文定义 AI Kitchen 在 Google Play 和 Apple App Store 上架前的产品、隐私、账户、AI 内容、权限、素材和审核准备。具体政策会变化，正式提交前必须以当时官方政策和法律审查为准。

| 属性 | 内容 |
|---|---|
| 文档状态 | Draft / Must Be Revalidated Before Submission |
| 实施状态 | 尚未创建商店账号、Listing 或正式政策页面 |
| 优先顺序 | Google Play 封闭测试 → Android 小范围发布 → iOS |
| 最后更新 | 2026-07-27 |

---

## 1. 上架目标

- App 有真实移动端价值，不是网页套壳；
- 核心功能可审核；
- AI 生成边界和反馈入口清晰；
- 隐私申报与真实数据流一致；
- 账户可删除；
- 权限最小化；
- 内容和营养不作医疗承诺；
- 测试账号/说明完整；
- 支持和政策页面可访问；
- 版本可监控、灰度和回滚。

---

## 2. 必备资产

- 应用名称、副标题/简短说明；
- 图标；
- 手机截图；
- 特色图/预览视频（按平台需要）；
- 完整描述；
- 分类和关键词；
- 隐私政策 URL；
- 用户协议；
- 支持 URL/邮箱；
- 账户删除页面；
- AI 内容说明和反馈；
- 审核说明；
- 测试账号或 guest 路径；
- 年龄分级；
- 数据安全/隐私标签。

素材不能展示未发布功能或误导性医疗效果。

---

## 3. AI 内容要求

App 内应：

- 说明菜谱由 AI 辅助生成并经程序校验；
- 提供结果问题/安全反馈；
- 不让模型冒充专业人士；
- 不展示危险 Candidate；
- 不保证绝对安全或营养精确；
- 对用户输入发送第三方 AI 有清晰说明；
- 对异常结果可追踪 requestId；
- 对模型供应商变化更新隐私材料。

审核说明可解释“模型候选→Schema→业务→食品安全→Final Recipe”的流程。

---

## 4. 隐私与数据申报

提交前以实际 SDK 和网络流量核对：

- 账户标识；
- 用户内容；
- 偏好/过敏数据；
- 诊断和崩溃；
- 分析；
- 是否关联身份；
- 是否共享第三方；
- 用途；
- 加密传输；
- 删除能力；
- tracking/广告。

不能因为数据经过自有后端就声称未发送第三方 AI。

---

## 5. 账户与删除

若 App 支持创建账户：

- App 内可发起删除；
- 说明删除范围和处理时间；
- 不只提供停用；
- 删除云端和本地；
- 处理第三方身份和会话；
- 政策页面可访问；
- 审核人员可验证；
- 无账号 guest 不强制注册。

如果使用第三方登录，iOS 的登录方式要求需要在提交时按当时政策核对。

---

## 6. 权限

首版核心不需要相机、麦克风、位置、联系人。计时提醒可请求通知：

- 使用时请求；
- 文案明确；
- 拒绝后计时仍可用；
- Manifest/Info.plist 与功能一致；
- 未使用权限从构建中移除；
- SDK 引入的权限也要审查。

后续拍照/语音功能上线前重新审查。

---

## 7. 健康与营养边界

- 营养显示为估算；
- 不宣称诊断、治疗、预防疾病；
- 不保证减脂/增肌结果；
- 不把过敏规则描述为绝对保障；
- 高风险用户提示咨询专业人士；
- 来源和置信度可查看；
- 不使用“医疗级、精准治疗”等素材。

若未来进入健康数据平台或读取 HealthKit/Health Connect，需单独架构和合规评审。

---

## 8. 内容与安全

- 非食用物和危险结果阻断；
- 用户反馈/举报；
- 支持团队处理流程；
- 不鼓励危险挑战；
- 不复制他人菜谱图片/文案；
- 使用有许可的图标、字体、素材和营养数据；
- UGC 社区不在首版，未来需内容审核。

---

## 9. 订阅和支付

首版若无订阅，不加入支付 SDK。未来会员：

- 数字功能通常使用平台内购；
- 清晰价格、周期、试用和取消；
- Restore Purchases；
- 服务端 entitlement；
- 隐私和财务处理；
- 不通过外部支付绕过平台规则（按提交时政策）；
- 免费次数与生成成本透明。

---

## 10. Google Play 准备

- Developer account；
- App signing；
- package ID；
- Data Safety；
- content rating；
- target API/政策核对；
- closed testing；
- testers 和 feedback；
- privacy/deletion URLs；
- staged rollout；
- ANR/crash 监控；
- 权限声明；
- App access 审核说明。

具体封闭测试要求和 target API 会变化，提交前必须重新验证官方要求。

---

## 11. Apple 准备

- Developer account/certificates；
- bundle ID；
- App Store Connect；
- Privacy Nutrition Label；
- Privacy Manifest/required reason APIs；
- Sign in requirements；
- TestFlight；
- export compliance；
- age rating；
- account deletion；
- review notes/demo；
- screenshots/device sizes。

iOS 在 Android 稳定后进行，但架构不能依赖 Android-only 行为。

---

## 12. 审核说明模板

```text
核心用途：用户选择已有食材并生成结构化菜谱。
AI：App 只调用自有后端；模型生成候选，服务端执行结构、业务和食品安全规则。
测试路径：...
Guest：无需登录可体验...
账户删除：我的 → 账户与隐私 → 删除账户。
通知：仅在用户为烹饪计时启用提醒时请求。
营养：一般性估算，不提供医疗建议。
支持：...
```

审核说明必须与版本真实路径一致。

---

## 13. Listing 文案边界

允许：

- “根据现有食材生成可执行菜谱”；
- “支持烹饪步骤和计时”；
- “提供一般性营养估算”；
- “考虑用户设置的过敏和忌口约束”。

避免：

- “100% 安全”；
- “绝不出错”；
- “精准营养”；
- “治愈/治疗”；
- “医生/营养师替代”；
- 未上线的拍照、语音和周菜单。

---

## 14. 截图与预览

应展示：

- 食材选择；
- 生成条件；
- Recipe 详情；
- 烹饪模式；
- 历史/收藏；
- 安全提示（不过度恐吓）；
- 营养估算标识。

使用合成数据，不出现真实邮箱、requestId、Token 或第三方品牌侵权内容。

---

## 15. 支持与运营

发布前：

- 支持邮箱和页面；
- 常见问题；
- 状态/故障沟通方式；
- 安全反馈升级；
- 账户删除支持；
- 数据请求流程；
- 响应时限；
- 版本最低支持策略。

没有维护能力时不要一次开放过多地区和语言。

---

## 16. 审核被拒流程

- 保存完整拒绝原因；
- 不盲目反复提交同包；
- 对照实际政策和功能；
- 最小修复；
- 更新文档/申报；
- 提供清晰回复和演示；
- 若涉及架构/数据，更新 DECISIONS；
- 复盘加入发布检查表。

---

## 17. 发布前最终检查

- production API/Keys；
- RLS；
- safety tests；
- account deletion；
- privacy policy；
- store declarations；
- support links；
- version/signing；
- screenshots；
- test account；
- crash monitoring；
- staged rollout；
- rollback；
- no debug menu；
- all permissions justified；
- no placeholder text。

---

## 18. Definition of Done

- [ ] 商店账号和签名受控；
- [ ] Listing 素材和文案真实；
- [ ] 隐私/数据标签与实际流量一致；
- [ ] 账户删除可验证；
- [ ] AI 说明和反馈入口；
- [ ] 权限最小化；
- [ ] 营养/安全无误导承诺；
- [ ] 测试路径和审核说明完整；
- [ ] Google Play closed test 完成；
- [ ] TestFlight/iOS 准备完成（P2）；
- [ ] 监控、支持、灰度和回滚可用；
- [ ] 提交前重新核对最新官方政策。

---

## 19. 当前结论

商店合规不是发布当天填写表格，而是产品、数据、权限、账户和运营能力的结果。AI Kitchen 必须先让真实行为与隐私、安全和营养边界一致，再据此填写商店申报；任何政策细节在正式提交前重新查证。
