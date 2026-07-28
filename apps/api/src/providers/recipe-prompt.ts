import { INGREDIENT_FIXTURES, type GenerationRequest } from '@ai-kitchen/shared';

const ingredientById = new Map(INGREDIENT_FIXTURES.map((ingredient) => [ingredient.id, ingredient]));

const recipeSchemaGuide = {
  recipeId: '候选标识字符串；服务端会替换为正式 UUID',
  generationMode: 'provider',
  title: '中文菜名',
  description: '简短中文说明',
  servings: '正整数',
  totalTimeMinutes: '正整数，不能超过用户限制',
  difficulty: 'easy 或 medium',
  spiceLevel: 'mild 或 medium',
  dietaryTags: 'vegetarian/low-spice/easy/balanced 的数组',
  allergenCodes: 'egg.chicken/wheat.common/milk.cow/nut.peanut/shellfish.shrimp 的数组',
  requiredCookware: 'frying-pan/pot/oven/rice-cooker 的数组',
  requiredIngredients: '[{ingredientId,displayName,amount}]',
  optionalIngredients: '[{ingredientId,displayName,amount}]',
  missingIngredients: '[{ingredientId,displayName,amount}]',
  steps: '[{stepId,order,title,instruction,durationMinutes,ingredientRefs}]',
  safetyNotices: '[{level: info|warning,message,isDemoOnly:boolean}]',
  nutritionStatus: 'unavailable',
};

function promptInput(request: GenerationRequest): Record<string, unknown> {
  return {
    selectedIngredients: request.selectedIngredientIds.map((id) => ({ id, displayName: ingredientById.get(id)?.displayName ?? id })),
    customIngredients: request.customIngredients.map(({ id, displayName }) => ({ id, displayName })),
    servings: request.servings,
    maxCookingTimeMinutes: request.maxCookingTimeMinutes,
    availableTools: request.availableTools,
    dietaryPreferences: request.dietaryPreferences,
    allergens: request.allergens,
    excludedIngredients: request.excludedIngredients,
  };
}

export function buildRecipeSystemPrompt(): string {
  return [
    '你是 AI Kitchen 的中文菜谱候选生成器。',
    '只能输出一个 JSON 对象，不得使用 Markdown、解释或额外文本。',
    '如果无法安全满足约束，只输出 {"status":"no_match"}。',
    '不得把用户过敏原或忌口食材加入菜谱；不得声称医疗级或绝对安全。',
    '必须遵守人数、时间和可用厨具；requiredIngredients 必须来自用户已选标准食材。',
    `菜谱对象必须包含这些字段：${JSON.stringify(recipeSchemaGuide)}。`,
  ].join('\n');
}

export function buildRecipeUserPrompt(request: GenerationRequest): string {
  return `根据以下标准化生成条件创建一份可执行中文菜谱候选：\n${JSON.stringify(promptInput(request))}`;
}

export function buildRecipeRepairPrompt(input: { candidate: unknown; reason: string }): string {
  return [
    '修复下面的菜谱候选，只输出符合既定 JSON 字段规范的一个 JSON 对象。',
    `受控错误摘要：${input.reason}`,
    `候选：${JSON.stringify(input.candidate)}`,
    '不要输出解释；如无法安全修复，只输出 {"status":"no_match"}。',
  ].join('\n');
}
