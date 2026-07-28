import { AppCard } from '@/components/app-card';
import { ThemedText } from '@/components/themed-text';
import type { RecipeStep } from '@ai-kitchen/shared';
export function CookingStepCard({ step }: { readonly step: RecipeStep }) { return <AppCard><ThemedText type="subtitle">{step.order}. {step.title}</ThemedText><ThemedText>{step.instruction}</ThemedText>{step.durationMinutes !== undefined && <ThemedText>时间：{step.durationMinutes} 分钟</ThemedText>}{step.ingredientRefs.length > 0 && <ThemedText>关联食材：{step.ingredientRefs.join('、')}</ThemedText>}</AppCard>; }
