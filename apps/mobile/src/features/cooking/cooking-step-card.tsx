import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RecipeStep } from '@ai-kitchen/shared';

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function CookingStepCard({ step }: { readonly step: RecipeStep }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRemaining(null);
  };

  useEffect(() => stopTimer, []);

  const startTimer = () => {
    if (step.durationMinutes === undefined) return;
    const total = step.durationMinutes * 60;
    setRemaining(total);
    intervalRef.current = setInterval(() => {
      setRemaining((current) => {
        if (current === null) return null;
        if (current <= 1) {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  };

  const isRunning = remaining !== null && remaining > 0;

  return <AppCard style={styles.card}>
    <View style={styles.headRow}>
      <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stepBadge}>
        <ThemedText type="smallBold" style={styles.stepBadgeText}>{step.order}</ThemedText>
      </LinearGradient>
      <ThemedText type="subtitle" style={styles.stepTitle}>{step.title}</ThemedText>
      {step.durationMinutes !== undefined && (
        <View style={styles.duration}>
          <ThemedText type="small" style={{ color: theme.primary }}>{t('recipe.duration', { count: step.durationMinutes })}</ThemedText>
        </View>
      )}
    </View>
    <ThemedText style={styles.instruction}>{step.instruction.replace(/\\n/g, '\n')}</ThemedText>
    {step.durationMinutes !== undefined && (
      <View style={styles.timerRow}>
        {isRunning ? (
          <ThemedText type="subtitle" style={[styles.timerText, { color: theme.primary }]}>{formatRemaining(remaining ?? 0)}</ThemedText>
        ) : null}
        {remaining === 0 ? <ThemedText type="small" style={{ color: theme.primary }}>{t('recipe.timer.done')}</ThemedText> : null}
        <AppButton
          label={isRunning ? t('recipe.timer.stop') : t('recipe.timer.start')}
          variant={isRunning ? 'secondary' : 'ghost'}
          onPress={isRunning ? stopTimer : startTimer}
        />
      </View>
    )}
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
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  timerText: { fontVariant: ['tabular-nums'] },
});
