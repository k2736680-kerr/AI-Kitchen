import type { IngredientDefinition } from '../ingredients/types';

export const INGREDIENT_FIXTURES: readonly IngredientDefinition[] = [
  { id: 'egg', displayName: '鸡蛋', aliases: ['蛋', '鸡子'], category: 'egg' },
  { id: 'tomato', displayName: '番茄', aliases: ['西红柿', '番茄子'], category: 'vegetable' },
  { id: 'onion', displayName: '洋葱', aliases: ['葱头'], category: 'vegetable' },
  { id: 'rice', displayName: '米饭', aliases: ['熟米饭', '白饭'], category: 'staple' },
  { id: 'carrot', displayName: '胡萝卜', aliases: ['红萝卜'], category: 'vegetable' },
  { id: 'green-pepper', displayName: '青椒', aliases: ['甜椒'], category: 'vegetable' },
  { id: 'chicken-breast', displayName: '鸡胸肉', aliases: ['鸡胸'], category: 'meat' },
  { id: 'potato', displayName: '土豆', aliases: ['马铃薯'], category: 'vegetable' },
  { id: 'broccoli', displayName: '西兰花', aliases: ['绿花菜'], category: 'vegetable' },
  { id: 'noodles', displayName: '面条', aliases: ['挂面', '面'], category: 'staple' },
];
