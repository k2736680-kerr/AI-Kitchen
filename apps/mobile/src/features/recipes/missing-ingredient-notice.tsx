import { StatusMessage } from '@/components/status-message';
import { useTranslation } from 'react-i18next';
import type { RecipeIngredient } from '@ai-kitchen/shared';
export function MissingIngredientNotice({ ingredients }: { readonly ingredients: readonly RecipeIngredient[] }) { const { t } = useTranslation(); return ingredients.length ? <StatusMessage message={t('recipe.missingIngredients', { items: ingredients.map((item) => item.displayName).join(' · ') })} tone="warning" /> : null; }
