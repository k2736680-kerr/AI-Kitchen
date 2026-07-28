import { StatusMessage } from '@/components/status-message';
import type { RecipeIngredient } from '@ai-kitchen/shared';
export function MissingIngredientNotice({ ingredients }: { readonly ingredients: readonly RecipeIngredient[] }) { return ingredients.length ? <StatusMessage message={`缺少食材：${ingredients.map((item) => item.displayName).join('、')}`} tone="error" /> : null; }
