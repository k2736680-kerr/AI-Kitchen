import type { IngredientDefinition, IngredientLocale, RecipeIngredient, SelectedIngredient } from '@ai-kitchen/shared';
import { fixtureIngredientRepository } from '../../data/fixtures/ingredient-repository';

function formattedIngredientId(id: string): string { return id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()); }
export function resolveIngredientLocale(language: string): IngredientLocale { return language === 'en-US' ? 'en-US' : 'zh-CN'; }
export function presentCatalogIngredient(ingredient: IngredientDefinition, locale: IngredientLocale): { readonly name: string; readonly aliases: readonly string[] } { const localized = ingredient.localization[locale] ?? ingredient.localization['zh-CN']; return { name: localized.name || formattedIngredientId(ingredient.id), aliases: localized.aliases.filter((alias) => alias !== localized.name) }; }
export function presentIngredientId(id: string, locale: IngredientLocale): string { const ingredient = fixtureIngredientRepository.getById(id); return ingredient ? presentCatalogIngredient(ingredient, locale).name : formattedIngredientId(id); }
export function presentSelectedIngredient(ingredient: SelectedIngredient, locale: IngredientLocale): string { return ingredient.source === 'custom' ? ingredient.displayName : presentIngredientId(ingredient.id, locale); }
export function presentRecipeIngredient(ingredient: RecipeIngredient, locale: IngredientLocale): string { return fixtureIngredientRepository.getById(ingredient.ingredientId) ? presentIngredientId(ingredient.ingredientId, locale) : ingredient.displayName; }
