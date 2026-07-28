import { ThemedText } from '@/components/themed-text';
import type { RecipeStep } from '@ai-kitchen/shared';
export function CookingStepList({ steps, currentStepIndex, completedStepIndexes }: { readonly steps: readonly RecipeStep[]; readonly currentStepIndex: number; readonly completedStepIndexes: readonly number[] }) { const completed = new Set(completedStepIndexes); return <>{steps.map((step, index) => <ThemedText key={step.stepId}>步骤 {step.order}：{completed.has(index) ? '已完成' : index === currentStepIndex ? '当前步骤' : '待进行'}</ThemedText>)}</>; }
