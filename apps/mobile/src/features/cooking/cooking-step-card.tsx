import { AppCard } from '@/components/app-card';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import type { RecipeStep } from '@ai-kitchen/shared';
export function CookingStepCard({ step }: { readonly step: RecipeStep }) { const { t } = useTranslation(); return <AppCard><ThemedText type="sectionTitle">{t('recipe.step', { count: step.order })} · {step.title}</ThemedText><ThemedText>{step.instruction.replace(/\\n/g, '\n')}</ThemedText>{step.durationMinutes !== undefined && <ThemedText type="small" themeColor="textSecondary">{t('recipe.duration', { count: step.durationMinutes })}</ThemedText>}</AppCard>; }
