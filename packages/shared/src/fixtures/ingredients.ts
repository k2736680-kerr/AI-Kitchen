import type { IngredientDefinition } from '../ingredients/types';

export const INGREDIENT_FIXTURES: readonly IngredientDefinition[] = [
  { id: 'egg', displayName: '鸡蛋', category: 'egg', localization: { 'zh-CN': { name: '鸡蛋', aliases: ['蛋', '鸡子'] }, 'en-US': { name: 'Egg', aliases: ['Eggs'] } }, allergenCodes: ['egg.chicken'] },
  { id: 'tomato', displayName: '番茄', category: 'vegetable', localization: { 'zh-CN': { name: '番茄', aliases: ['西红柿', '番茄子'] }, 'en-US': { name: 'Tomato', aliases: [] } } },
  { id: 'onion', displayName: '洋葱', category: 'vegetable', localization: { 'zh-CN': { name: '洋葱', aliases: ['葱头'] }, 'en-US': { name: 'Onion', aliases: [] } } },
  { id: 'rice', displayName: '米饭', category: 'staple', localization: { 'zh-CN': { name: '米饭', aliases: ['熟米饭', '白饭'] }, 'en-US': { name: 'Cooked rice', aliases: ['Rice'] } } },
  { id: 'carrot', displayName: '胡萝卜', category: 'vegetable', localization: { 'zh-CN': { name: '胡萝卜', aliases: ['红萝卜'] }, 'en-US': { name: 'Carrot', aliases: [] } } },
  { id: 'green-pepper', displayName: '青椒', category: 'vegetable', localization: { 'zh-CN': { name: '青椒', aliases: ['甜椒'] }, 'en-US': { name: 'Green pepper', aliases: ['Bell pepper'] } } },
  { id: 'chicken-breast', displayName: '鸡胸肉', category: 'meat', localization: { 'zh-CN': { name: '鸡胸肉', aliases: ['鸡胸'] }, 'en-US': { name: 'Chicken breast', aliases: [] } } },
  { id: 'potato', displayName: '土豆', category: 'vegetable', localization: { 'zh-CN': { name: '土豆', aliases: ['马铃薯'] }, 'en-US': { name: 'Potato', aliases: [] } } },
  { id: 'broccoli', displayName: '西兰花', category: 'vegetable', localization: { 'zh-CN': { name: '西兰花', aliases: ['绿花菜'] }, 'en-US': { name: 'Broccoli', aliases: [] } } },
  { id: 'noodles', displayName: '面条', category: 'staple', localization: { 'zh-CN': { name: '面条', aliases: ['挂面', '面'] }, 'en-US': { name: 'Noodles', aliases: [] } }, allergenCodes: ['wheat.common'] },
];
