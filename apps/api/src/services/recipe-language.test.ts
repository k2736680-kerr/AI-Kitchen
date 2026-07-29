import { describe, expect, it } from 'vitest';
import { RECIPE_FIXTURES } from '@ai-kitchen/shared';

import { validateRecipeLanguage } from './recipe-language';

const englishRecipe = {
  ...RECIPE_FIXTURES[0],
  locale: 'en-US' as const,
  title: 'Tomato egg noodles',
  description: 'A quick bowl of noodles with tomato and egg.',
  steps: RECIPE_FIXTURES[0].steps.map((step, index) => ({ ...step, title: `Step ${index + 1}`, instruction: `Cook the ingredients for step ${index + 1}.` })),
  safetyNotices: [{ ...RECIPE_FIXTURES[0].safetyNotices[0], message: 'Check ingredients and cookware before serving.' }],
};

describe('recipe language consistency', () => {
  it('accepts matching Chinese and English narrative content', () => {
    expect(validateRecipeLanguage(RECIPE_FIXTURES[0], 'zh-CN')).toEqual([]);
    expect(validateRecipeLanguage(englishRecipe, 'en-US')).toEqual([]);
  });

  it('rejects a provider response in the wrong narrative language', () => {
    expect(validateRecipeLanguage(RECIPE_FIXTURES[0], 'en-US')).not.toEqual([]);
    expect(validateRecipeLanguage(englishRecipe, 'zh-CN')).not.toEqual([]);
  });

  it('rejects common Traditional-only characters for a Simplified Chinese request', () => {
    expect(validateRecipeLanguage({ ...RECIPE_FIXTURES[0], title: '番茄雞蛋麵' }, 'zh-CN')).not.toEqual([]);
  });
});
