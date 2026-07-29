import { StatusMessage } from '@/components/status-message';
import { useTranslation } from 'react-i18next';
import type { RecipeIngredient } from '@ai-kitchen/shared';
import { presentRecipeIngredient, resolveIngredientLocale } from '@/features/ingredients/ingredient-presentation';
export function MissingIngredientNotice({ ingredients }: { readonly ingredients: readonly RecipeIngredient[] }) { const { t, i18n } = useTranslation(); const locale = resolveIngredientLocale(i18n.language); return ingredients.length ? <StatusMessage message={t('recipe.missingIngredients', { items: ingredients.map((item) => presentRecipeIngredient(item, locale)).join(' · ') })} tone="warning" /> : null; }
