import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AppCard } from '@/components/app-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RecipeStep } from '@ai-kitchen/shared';

export function CookingStepCard({ step }: { readonly step: RecipeStep }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return <AppCard style={styles.card}>
    <View style={styles.headRow}>
      <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stepBadge}>
        <ThemedText type="smallBold" style={styles.stepBadgeText}>{step.order}</ThemedText>
      </LinearGradient>
      <ThemedText type="subtitle" style={styles.stepTitle}>{step.title}</ThemedText>
      {step.durationMinutes !== undefined && <View style={styles.duration}><ThemedText type="small" style={{ color: theme.primary }}>{t('recipe.duration', { count: step.durationMinutes })}</ThemedText></View>}
    </View>
    <ThemedText style={styles.instruction}>{step.instruction.replace(/\\n/g, '\n')}</ThemedText>
  </AppCard>;
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { color: '#FFFFFF', fontSize: 15 },
  stepTitle: { flex: 1 },
  duration: { backgroundColor: 'rgba(79,128,98,0.1)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  instruction: { lineHeight: 24 },
});
