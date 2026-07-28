import { AppCard } from '@/components/app-card';
import { ThemedText } from '@/components/themed-text';
import type { RecipeStep } from '@ai-kitchen/shared';
export function RecipeStepList({ steps }: { readonly steps: readonly RecipeStep[] }) { return <AppCard><ThemedText type="subtitle" style={{ fontSize: 20 }}>烹饪步骤</ThemedText>{steps.map((step) => <ThemedText key={step.stepId}>{step.order}. {step.title}（{step.durationMinutes} 分钟）\n{step.instruction}\n关联：{step.ingredientRefs.join('、')}</ThemedText>)}</AppCard>; }
