import type { Recipe, SupportedLocale } from '@ai-kitchen/shared';

const chineseCharacter = /[\u3400-\u9fff]/u;
const commonTraditionalOnlyCharacter = /[雞麵鍋蔥薑醬臺萬與為後個會來時國這裡]/u;

function hasChinese(value: string): boolean {
  return chineseCharacter.test(value);
}

export function validateRecipeLanguage(recipe: Recipe, locale: SupportedLocale): readonly string[] {
  const narrative = [
    recipe.title,
    recipe.description,
    ...recipe.steps.flatMap((step) => [step.title, step.instruction]),
    ...recipe.safetyNotices.map((notice) => notice.message),
  ];
  if (locale === 'zh-CN') {
    if (!narrative.every(hasChinese)) return ['菜谱正文未完整使用简体中文。'];
    return narrative.some((value) => commonTraditionalOnlyCharacter.test(value)) ? ['菜谱正文包含繁体中文字符。'] : [];
  }
  return narrative.some(hasChinese) ? ['菜谱正文包含与请求语言不一致的中文内容。'] : [];
}
