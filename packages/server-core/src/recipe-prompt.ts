import { COOKING_METHOD_OPTIONS, INGREDIENT_FIXTURES, type GenerationRequest, type SupportedLocale } from '@ai-kitchen/shared';

const ingredientById = new Map(INGREDIENT_FIXTURES.map((ingredient) => [ingredient.id, ingredient]));

const recipeSchemaGuide = {
  recipeId: '候选标识字符串；服务端会替换为正式 UUID', generationMode: 'provider', title: '由服务端指定语言的菜名',
  description: '由服务端指定语言的简短说明', servings: '正整数', totalTimeMinutes: '正整数，不能超过用户限制',
  difficulty: 'easy、medium 或 hard', spiceLevel: 'mild、medium 或 hot', cookingMethod: '本方案指定的烹饪方式',
  cuisine: '必须严格为以下英文 ID 之一：sichuan/cantonese/hunan/jiangsu/zhejiang/northeastern/shandong/western/japanese/korean/other；禁止输出中文菜系名',
  flavor: '必须严格为以下英文 ID 之一：light/spicy/savory/sweet/sour/sweet-sour/salty；禁止输出中文口味名',
  dietaryTags: 'vegetarian/low-spice/easy/balanced 的数组',
  allergenCodes: 'egg.chicken/wheat.common/milk.cow/nut.peanut/shellfish.shrimp 的数组',
  requiredCookware: 'frying-pan/pot/oven/rice-cooker 的数组', requiredIngredients: '[{ingredientId,displayName,amount}]',
  optionalIngredients: '[{ingredientId,displayName,amount}]', missingIngredients: '[{ingredientId,displayName,amount}]',
  steps: '[{stepId,order,title,instruction,durationMinutes,ingredientRefs}]',
  safetyNotices: '[{level: info|warning,message,isDemoOnly:boolean}]', nutritionStatus: 'unavailable',
};

function promptInput(request: GenerationRequest): Record<string, unknown> {
  return {
    selectedIngredients: request.selectedIngredientIds.map((id) => ({ id, displayName: ingredientById.get(id)?.localization[request.locale].name ?? id })),
    customIngredients: request.customIngredients.map(({ id, displayName }) => ({ id, displayName })),
    servings: request.servings, maxCookingTimeMinutes: request.maxCookingTimeMinutes, availableTools: request.availableTools,
    dietaryPreferences: request.dietaryPreferences, allergens: request.allergens, excludedIngredients: request.excludedIngredients,
  };
}

function languageInstructions(locale: SupportedLocale): readonly string[] {
  return locale === 'en-US'
    ? ['Use natural American English for every user-facing natural-language field: title, description, ingredient displayName, step title/instruction, and safetyNotices.message.', '不得输出中文、中文翻译附注或中英文混杂内容；不得把内部 ingredientId、toolId、枚举值翻译为展示文本。']
    : ['所有面向用户的自然语言字段必须使用简体中文：title、description、食材 displayName、步骤 title/instruction 与 safetyNotices.message。', '不得输出繁体中文、英文翻译附注或中英文混杂内容；不得把内部 ingredientId、toolId、枚举值翻译为展示文本。'];
}

export function buildRecipeSystemPrompt(locale: SupportedLocale): string {
  return [
    '你是 AI Kitchen 的结构化菜谱候选生成器。', '只能输出一个 JSON 对象，不得使用 Markdown、解释或额外文本。',
    '如果无法安全满足约束，只输出 {"status":"no_match"}。', '不得把用户过敏原或忌口食材加入菜谱；不得声称医疗级或绝对安全。',
    '必须遵守人数、时间和可用厨具。',
    '主食材（requiredIngredients 中的非调料类）必须来自用户已选标准食材；盐、糖、生抽、食用油、葱姜蒜等调料香料视为厨房常备，可直接使用，不必要求用户提供。',
    ...languageInstructions(locale),
    '所有枚举字段必须输出字段说明中列出的稳定英文 ID；尤其 cuisine 与 flavor 禁止输出中文标签、自然语言或列表外值。',
    'JSON key、recipeId、ingredientId、toolId、difficulty、tag ID、时长、人数、步骤编号和布尔值必须保持既定稳定格式。recipe.locale 由服务端写入，不要自行决定。',
    `菜谱对象必须包含这些字段：${JSON.stringify(recipeSchemaGuide)}。`,
  ].join('\n');
}

export function buildRecipeUserPrompt(request: GenerationRequest, cookingMethod?: (typeof COOKING_METHOD_OPTIONS)[number]): string {
  const parts: string[] = [`根据以下标准化生成条件创建一份可执行菜谱候选。请求语言：${request.locale}。`];
  if (cookingMethod) parts.push(`本次方案的烹饪方式必须为：${cookingMethod}。请围绕该烹饪方式设计步骤、时长和口感。`);
  if (request.excludedRecipes.length > 0) parts.push(`不要生成与以下已生成菜谱相同的菜品（避免菜名或做法雷同）：${request.excludedRecipes.map((recipe) => `${recipe.title}（${recipe.cookingMethod}）`).join('、')}。`);
  parts.push(JSON.stringify(promptInput(request)));
  return parts.join('\n');
}

export function buildRecipeRepairPrompt(input: { candidate: unknown; reason: string; locale: SupportedLocale }): string {
  return ['修复下面的菜谱候选，只输出符合既定 JSON 字段规范的一个 JSON 对象；保持 JSON 结构和稳定机器字段不变。', ...languageInstructions(input.locale), `受控错误摘要：${input.reason}`, `候选：${JSON.stringify(input.candidate)}`, '不要输出解释；如无法安全修复，只输出 {"status":"no_match"}。'].join('\n');
}
