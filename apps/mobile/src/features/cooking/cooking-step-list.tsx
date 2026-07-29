import { ThemedText } from '@/components/themed-text';
import { useTranslation } from 'react-i18next';
import type { RecipeStep } from '@ai-kitchen/shared';
export function CookingStepList({ steps, currentStepIndex, completedStepIndexes }: { readonly steps: readonly RecipeStep[]; readonly currentStepIndex: number; readonly completedStepIndexes: readonly number[] }) { const { t } = useTranslation(); const completed = new Set(completedStepIndexes); return <>{steps.map((step, index) => <ThemedText type="small" key={step.stepId} themeColor={index === currentStepIndex ? 'primary' : 'textSecondary'}>{t('recipe.step', { count: step.order })} · {completed.has(index) ? t('cooking.done') : index === currentStepIndex ? t('cooking.current') : t('cooking.pending')}</ThemedText>)}</>; }
