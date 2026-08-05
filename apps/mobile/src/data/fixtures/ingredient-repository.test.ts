import { describe, expect, it } from 'vitest';
import { INGREDIENT_FIXTURES } from '@ai-kitchen/shared';
import { fixtureIngredientRepository } from './ingredient-repository';
import { presentCatalogIngredient, presentIngredientId } from '../../features/ingredients/ingredient-presentation';

describe('localized ingredient catalog', () => {
  it('contains complete Chinese and English presentation for every standard ingredient', () => {
    expect(INGREDIENT_FIXTURES.length).toBeGreaterThanOrEqual(150);
    for (const ingredient of INGREDIENT_FIXTURES) {
      expect(ingredient.localization['zh-CN'].name).not.toEqual('');
      expect(ingredient.localization['en-US'].name).not.toEqual('');
      expect(ingredient.localization['en-US'].name).not.toMatch(/[\u4e00-\u9fff]/);
    }
  });

  it('searches only the active language name and aliases', () => {
    expect(fixtureIngredientRepository.search('西红柿', undefined, 'zh-CN').map((item) => item.id)).toEqual(['tomato']);
    expect(fixtureIngredientRepository.search(' egg ', undefined, 'en-US').map((item) => item.id)).toContain('egg');
    expect(fixtureIngredientRepository.search('西红柿', undefined, 'en-US')).toEqual([]);
  });

  it('uses localized names, hides unnecessary aliases, and has a readable fallback', () => {
    const egg = fixtureIngredientRepository.getById('egg');
    const tomato = fixtureIngredientRepository.getById('tomato');
    expect(egg && presentCatalogIngredient(egg, 'en-US')).toEqual({ name: 'Egg', aliases: ['Eggs'] });
    expect(tomato && presentCatalogIngredient(tomato, 'en-US')).toEqual({ name: 'Tomato', aliases: [] });
    expect(presentIngredientId('unknown_ingredient', 'en-US')).toBe('Unknown Ingredient');
  });
});
