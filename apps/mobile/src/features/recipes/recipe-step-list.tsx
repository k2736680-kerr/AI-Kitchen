import { AppCard } from '@/components/app-card';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import type { RecipeStep } from '@ai-kitchen/shared';
export function RecipeStepList({ steps }: { readonly steps: readonly RecipeStep[] }) { const { t } = useTranslation(); return <AppCard><ThemedText type="sectionTitle">{t('recipe.steps')}</ThemedText>{steps.map((step) => <View key={step.stepId} style={{ gap: 4, paddingVertical: 8 }}><ThemedText type="subtitle">{t('recipe.step', { count: step.order })} · {step.title}</ThemedText><ThemedText>{step.instruction.replace(/\\n/g, '\n')}</ThemedText><ThemedText type="small" themeColor="textSecondary">{t('recipe.duration', { count: step.durationMinutes })}</ThemedText></View>)}</AppCard>; }
